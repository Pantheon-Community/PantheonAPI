import { ForbiddenError } from "@/errors/ForbiddenError";
import { NotFoundError } from "@/errors/NotFoundError";
import { pg, pgTransaction, type TransactionSql } from "@/global/pg";
import type {
    PublicEventCatalogModel,
    PublicEventDeliveryModel,
    PublicEventOrderModel,
    PublicEventRoundModel,
    PublicEventServerModel,
} from "@/models/PublicEventModel";
import type { PublicEventServerId, PublicEventCategory } from "@/shared/types/PublicEvents";
import {
    listPublicEventCommands,
    isSupportedEventCommand,
    validateCatalogCommand,
    validateEventCommand,
    eventRequiresDonor,
    eventComingSoon,
} from "./publicEventCommands";
import { requireEventAccess } from "./publicEventAccess";
import { sql as bunSql } from "bun";

/** How long a plugin instance stays authoritative without a heartbeat. */
export const INSTANCE_TTL_MS = 30_000;

/** A reserved-but-not-yet-started delivery holds its place for this long. */
export const PREPARE_LEASE_MS = 120_000;

/** Purchased events must start within this window after the round starts. */
export const START_WINDOW_MS = 14_000;

/** After authorising a start, the plugin has this long to report an outcome. */
export const RESULT_LEASE_MS = 60_000;

/** Completed rounds required between two paid events on the same server. */
export const REQUIRED_GAP = 3;

export interface BoundServer {
    id: PublicEventServerId;
    name: string;
    enabled: boolean;
    online: boolean;
    pendingCount: number;
    gapRemaining: number;
}

export interface PublicQueueItem {
    id: number;
    eventName: string;
    serverId: string;
    serverName: string;
    purchaserName: string;
    createdAt: string;
    status: string;
    position: number;
    repeatDeferral: "none" | "moved" | "waiting";
}

export interface AdminOrderItem {
    id: number;
    buyerId: string;
    eventName: string;
    command: string;
    serverId: string;
    serverName: string;
    purchaserName: string;
    cost: number;
    balanceAfter: number;
    createdAt: string;
    status: string;
    position: number;
    repeatDeferral: "none" | "moved" | "waiting";
    message: string;
    delivery: {
        id: string;
        roundId: string;
        roundNumber: number;
        instanceId: string;
        status: string;
        leaseUntil: string;
        authorizedAt: string | null;
        outcome: string | null;
        message: string | null;
    } | null;
    audits: { actorId: string; outcome: string; reason: string; createdAt: string }[];
}

export interface RoundReservation {
    orderId: number;
    deliveryId: string;
    command: string;
    eventName: string;
    status: "reserved" | "starting" | "uncertain";
}

export interface RoundDecision {
    serverId: string;
    roundId: string;
    roundNumber: number;
    gapRemaining: number;
    reservation: RoundReservation | null;
}

function toNumber(value: unknown): number {
    const parsed = typeof value === "string" ? Number(value) : value;
    if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
        throw new Error(`Expected a numeric database value, got ${String(value)}`);
    }
    return parsed;
}

function assertServerId(value: string): PublicEventServerId {
    if (value !== "1" && value !== "2") {
        throw new NotFoundError({
            title: "Unknown Server",
            description: "Only servers 1 and 2 accept purchased events.",
        });
    }
    return value;
}

async function hashPayload(payload: unknown): Promise<string> {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Gap computation
// ---------------------------------------------------------------------------

/**
 * Completed rounds still required before the head order on this server may run.
 *
 * Counts only rounds that reached `ended_at`, which is set exclusively by a
 * normal `ended` report for a round that had started. Abandoned rounds (the
 * plugin went away mid-round) never count, so the queue simply waits.
 */
async function computeGap(
    sql: TransactionSql,
    serverId: string,
    lastPaidRoundNumber: number | null,
): Promise<number> {
    if (lastPaidRoundNumber === null) return 0;

    const rows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count
        FROM public_event_rounds
        WHERE server_id = ${serverId}
        AND number > ${lastPaidRoundNumber}
        AND ended_at IS NOT NULL
    `;

    const completed = toNumber(rows[0]?.count ?? "0");

    return Math.max(0, REQUIRED_GAP - completed);
}

// ---------------------------------------------------------------------------
// Stale delivery cleanup
// ---------------------------------------------------------------------------

/**
 * Resolves deliveries whose plugin can no longer report on them.
 *
 * `reserved` without a lease means the round never got as far as authorisation,
 * so the event definitely did not run and the order returns to the queue.
 * `starting` without a lease means the API authorised a start and heard nothing
 * back; we cannot prove either way, so the order is quarantined for staff.
 */
async function cleanupStaleDeliveries(sql: TransactionSql, serverId: string): Promise<void> {
    await sql`
        UPDATE public_event_deliveries AS d
        SET status = 'expired', message = COALESCE(d.message, 'Reservation lease expired before the round started.')
        FROM public_event_orders AS o
        WHERE d.order_id = o.id
        AND o.delivery_id = d.id
        AND o.server_id = ${serverId}
        AND d.status = 'reserved'
        AND d.lease_until < NOW()
        AND o.status IN ('reserved','starting')
    `;

    await sql`
        UPDATE public_event_orders AS o
        SET status = 'queued', message = 'Reservation expired; the event will be retried on a later round.'
        FROM public_event_deliveries AS d
        WHERE d.order_id = o.id
        AND o.delivery_id = d.id
        AND o.server_id = ${serverId}
        AND d.status = 'expired'
        AND o.status IN ('reserved','starting')
    `;

    await sql`
        UPDATE public_event_deliveries AS d
        SET status = 'uncertain', message = COALESCE(d.message, 'Start was authorised but no outcome was reported.')
        FROM public_event_orders AS o
        WHERE d.order_id = o.id
        AND o.delivery_id = d.id
        AND o.server_id = ${serverId}
        AND d.status = 'starting'
        AND d.lease_until < NOW()
        AND o.status IN ('reserved','starting')
    `;

    await sql`
        UPDATE public_event_orders AS o
        SET status = 'uncertain', message = 'Start was authorised but no outcome was reported; staff must reconcile this order.'
        FROM public_event_deliveries AS d
        WHERE d.order_id = o.id
        AND o.delivery_id = d.id
        AND o.server_id = ${serverId}
        AND d.status = 'uncertain'
        AND o.status IN ('reserved','starting')
    `;
}

// ---------------------------------------------------------------------------
// Reservation
// ---------------------------------------------------------------------------

async function lastStartedCommand(sql: TransactionSql, serverId: string): Promise<string | null> {
    const [last] = await sql<{ command: string }[]>`
        SELECT o.command FROM public_event_deliveries d
        JOIN public_event_orders o ON o.id = d.order_id
        JOIN public_event_rounds r ON r.id = d.round_id
        WHERE o.server_id = ${serverId} AND d.status = 'started'
        ORDER BY r.number DESC, d.created_at DESC LIMIT 1
    `;
    return last?.command.split(" ")[0] ?? null;
}

/** Server lock required. Only queued repeats may yield; never pass a live or uncertain attempt. */
async function selectNonRepeatingOrder(
    sql: TransactionSql,
    serverId: string,
): Promise<PublicEventOrderModel | null> {
    const pending = await sql<PublicEventOrderModel[]>`
        SELECT * FROM public_event_orders
        WHERE server_id = ${serverId} AND status IN ('queued','reserved','starting','uncertain')
        ORDER BY COALESCE(queue_order, id), id
    `;
    const head = pending[0];
    if (head === undefined || head.status === "uncertain") return null;
    const last = await lastStartedCommand(sql, serverId);
    const fixed = head.status === "queued" ? 0 : 1;
    const tail = pending.slice(fixed);
    const barrier = tail.findIndex((order) => order.status !== "queued");
    const prefix = barrier < 0 ? tail : tail.slice(0, barrier);
    const remaining = [...prefix];
    const planned: PublicEventOrderModel[] = [];
    const moved = new Set<number>();
    const waiting: number[] = [];
    let previous = fixed === 0 ? last : head.command.split(" ")[0]!;
    // Plan the entire known segment, not just its head, so visible positions also avoid repeats.
    while (remaining.length > 0) {
        const index = remaining.findIndex((order) => order.command.split(" ")[0] !== previous);
        if (index < 0) {
            waiting.push(...remaining.map((order) => toNumber(order.id)));
            planned.push(...remaining);
            break;
        }
        for (const order of remaining.slice(0, index)) moved.add(toNumber(order.id));
        const order = remaining.splice(index, 1)[0]!;
        planned.push(order);
        previous = order.command.split(" ")[0]!;
    }
    const ordered = [...pending.slice(0, fixed), ...planned, ...tail.slice(prefix.length)];
    await sql`UPDATE public_event_orders AS o
        SET queue_order = ranked.position,
            repeat_deferral = CASE
                WHEN o.id = ANY(${bunSql.array(waiting, "INTEGER")}) THEN 'waiting'
                WHEN o.id = ANY(${bunSql.array([...moved], "INTEGER")}) THEN 'moved'
                WHEN o.id = ANY(${bunSql.array(
                    prefix.map((order) => toNumber(order.id)),
                    "INTEGER",
                )}) AND o.repeat_deferral = 'waiting' THEN 'none'
                ELSE o.repeat_deferral END
        FROM unnest(${bunSql.array(
            ordered.map((order) => toNumber(order.id)),
            "INTEGER",
        )}) WITH ORDINALITY AS ranked(id, position)
        WHERE o.id = ranked.id AND o.server_id = ${serverId}`;
    const next = planned[0];
    return fixed === 0 && next !== undefined && next.command.split(" ")[0] !== last ? next : null;
}

async function toReservation(
    sql: TransactionSql,
    delivery: PublicEventDeliveryModel,
): Promise<RoundReservation> {
    const [order] = await sql<PublicEventOrderModel[]>`
        SELECT * FROM public_event_orders WHERE id = ${delivery.order_id}
    `;

    if (order === undefined) {
        throw new Error(`Delivery ${delivery.id} references missing order ${delivery.order_id}`);
    }

    const status =
        delivery.status === "starting"
            ? "starting"
            : delivery.status === "uncertain"
              ? "uncertain"
              : "reserved";

    return {
        orderId: toNumber(order.id),
        deliveryId: delivery.id,
        command: order.command,
        eventName: order.event_name,
        status,
    };
}

/**
 * Returns the round's existing active delivery, or reserves the head order.
 *
 * Must be called with the server row locked. Queued repeats yield to the oldest
 * different command, but uncertain/live attempts always remain blocking barriers.
 */
async function ensureReservation(
    sql: TransactionSql,
    server: LockedServer,
    roundId: string,
    leaseMs: number,
): Promise<PublicEventDeliveryModel | null> {
    const active = await sql<PublicEventDeliveryModel[]>`
        SELECT * FROM public_event_deliveries
        WHERE round_id = ${roundId}
        AND status IN ('reserved','starting','uncertain','started')
        LIMIT 1
    `;

    if (active[0] !== undefined) return active[0];

    const [round] = await sql<PublicEventRoundModel[]>`
        SELECT * FROM public_event_rounds WHERE id = ${roundId}
    `;
    if (round === undefined || round.attempted || round.paid) return null;

    const gapRemaining = await computeGap(
        sql,
        server.id,
        server.last_paid_round_number === null ? null : toNumber(server.last_paid_round_number),
    );

    if (gapRemaining > 0) return null;

    const order = await selectNonRepeatingOrder(sql, server.id);
    if (order === null) return null;

    const deliveryId = crypto.randomUUID();

    const inserted = await sql<PublicEventDeliveryModel[]>`
        INSERT INTO public_event_deliveries (id, order_id, round_id, instance_id, status, lease_until)
        VALUES (${deliveryId}, ${order.id}, ${roundId}, ${server.instance_id}, 'reserved', NOW() + make_interval(secs => ${leaseMs / 1000}))
        RETURNING *
    `;

    const updated = await sql<PublicEventOrderModel[]>`
        UPDATE public_event_orders
        SET status = 'reserved', delivery_id = ${deliveryId}, repeat_deferral = 'none'
        WHERE id = ${order.id} AND status = 'queued'
        RETURNING *
    `;

    if (updated[0] === undefined || inserted[0] === undefined) {
        // Lost a race against another writer; the unique active-delivery index
        // means someone else reserved this round, which is fine.
        return (
            (
                await sql<PublicEventDeliveryModel[]>`
            SELECT * FROM public_event_deliveries
             WHERE round_id = ${roundId} AND status IN ('reserved','starting','uncertain','started')
            LIMIT 1
        `
            )[0] ?? null
        );
    }

    return inserted[0];
}

async function refreshLease(
    sql: TransactionSql,
    deliveryId: string,
    leaseMs: number,
): Promise<void> {
    await sql`
        UPDATE public_event_deliveries
        SET lease_until = NOW() + make_interval(secs => ${leaseMs / 1000})
        WHERE id = ${deliveryId} AND status = 'reserved'
    `;
}

// ---------------------------------------------------------------------------
// Server resolution / instance fencing
// ---------------------------------------------------------------------------

interface LockedServer {
    id: PublicEventServerId;
    name: string;
    enabled: boolean;
    plugin_token_id: string | null;
    instance_id: string | null;
    instance_until: Date | null;
    current_round: string | null;
    round_number: string;
    last_paid_round_number: string | null;
}

/**
 * Locks the server row and verifies the calling plugin owns it and is the
 * authoritative instance. Two live schedulers must never both run the same
 * round, so a different instance inside the TTL window is refused rather than
 * silently taking over.
 */
async function lockBoundServer(
    sql: TransactionSql,
    serverId: string,
    pluginTokenId: number,
    instanceId: string | null,
    allowDisabled = false,
): Promise<LockedServer> {
    const id = assertServerId(serverId);

    const rows = await sql<
        LockedServer[]
    >`SELECT * FROM public_event_servers WHERE id = ${id} FOR UPDATE`;

    const server = rows[0];

    if (server === undefined) {
        throw new NotFoundError({
            title: "Unknown Server",
            description: "This server is not registered for purchased events.",
        });
    }

    if (server.plugin_token_id === null || toNumber(server.plugin_token_id) !== pluginTokenId) {
        throw new ForbiddenError({
            title: "Wrong Server Token",
            description: "This plugin token is not bound to that server.",
        });
    }

    if (!server.enabled && !allowDisabled) {
        throw new ForbiddenError({
            title: "Server Disabled",
            description: "Purchased events are disabled for this server.",
        });
    }

    if (instanceId === null) return server;

    const now = Date.now();
    const live = server.instance_until !== null && server.instance_until.getTime() > now;

    if (server.instance_id === instanceId) {
        await sql`
            UPDATE public_event_servers
            SET instance_until = NOW() + make_interval(secs => ${INSTANCE_TTL_MS / 1000})
            WHERE id = ${id}
        `;
        server.instance_until = new Date(now + INSTANCE_TTL_MS);
        return server;
    }

    if (live) {
        throw new ForbiddenError({
            title: "Another Instance Is Active",
            description: "A different scheduler instance is still authoritative for this server.",
        });
    }

    await sql`
        UPDATE public_event_servers
        SET instance_id = ${instanceId}, instance_until = NOW() + make_interval(secs => ${INSTANCE_TTL_MS / 1000})
        WHERE id = ${id}
    `;

    server.instance_id = instanceId;
    server.instance_until = new Date(now + INSTANCE_TTL_MS);

    return server;
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

export async function getPublicCatalog(): Promise<
    {
        id: number;
        name: string;
        description: string;
        image: string | null;
        cost: number;
        category: PublicEventCategory;
        requiresDonor: boolean;
        requiresStaff: boolean;
        comingSoon: boolean;
    }[]
> {
    const rows = await pg<PublicEventCatalogModel[]>`
        SELECT * FROM public_event_catalog
        WHERE enabled = TRUE OR regexp_replace(lower(btrim(command)), '^/+', '') = 'walkingdead'
        ORDER BY id
    `;

    return rows
        .filter((row) => isSupportedEventCommand(row.command) || eventComingSoon(row.command))
        .map((row) => ({
            category: row.category,
            requiresDonor: eventRequiresDonor(row.command),
            requiresStaff: false,
            comingSoon: eventComingSoon(row.command),
            id: toNumber(row.id),
            name: row.name,
            description: row.description,
            image: row.image,
            cost: toNumber(row.cost),
        }));
}

export async function getPublicServers(): Promise<BoundServer[]> {
    return await pgTransaction(async (sql) => {
        const rows = await listServerRows(sql);

        const now = Date.now();

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            enabled: row.enabled,
            online: row.instance_until !== null && row.instance_until.getTime() > now,
            pendingCount: row.pendingCount,
            gapRemaining: row.gapRemaining,
        }));
    });
}

interface ServerRow {
    id: PublicEventServerId;
    name: string;
    enabled: boolean;
    instance_until: Date | null;
    pendingCount: number;
    gapRemaining: number;
    pluginTokenId: number | null;
    currentRound: string | null;
    roundNumber: number;
    lastPaidRoundNumber: number | null;
}

/**
 * Reads every server with its queue depth and remaining cooldown in one query,
 * so listing servers never issues a round-trip per row.
 */
async function listServerRows(sql: TransactionSql): Promise<ServerRow[]> {
    const rows = await sql<
        (PublicEventServerModel & { pending: string; completed_since_paid: string })[]
    >`
        SELECT
            s.*,
            (
                SELECT COUNT(*)::text FROM public_event_orders o
                WHERE o.server_id = s.id AND o.status IN ('queued','reserved','starting','uncertain')
            ) AS pending,
            (
                SELECT CASE WHEN s.last_paid_round_number IS NULL THEN 0 ELSE COUNT(*) END::text
                FROM public_event_rounds r
                WHERE r.server_id = s.id
                AND r.ended_at IS NOT NULL
                AND (s.last_paid_round_number IS NULL OR r.number > s.last_paid_round_number)
            ) AS completed_since_paid
        FROM public_event_servers s
        ORDER BY s.id
    `;

    return rows.map((row) => {
        const lastPaid =
            row.last_paid_round_number === null ? null : toNumber(row.last_paid_round_number);
        const completed = toNumber(row.completed_since_paid);

        return {
            id: assertServerId(row.id),
            name: row.name,
            enabled: row.enabled,
            instance_until: row.instance_until,
            pendingCount: toNumber(row.pending),
            gapRemaining: lastPaid === null ? 0 : Math.max(0, REQUIRED_GAP - completed),
            pluginTokenId: row.plugin_token_id === null ? null : toNumber(row.plugin_token_id),
            currentRound: row.current_round,
            roundNumber: toNumber(row.round_number),
            lastPaidRoundNumber: lastPaid,
        };
    });
}

export interface QueueQuery {
    page: number;
    perPage: number;
    serverId: PublicEventServerId | null;
}

export async function getPublicQueue(query: QueueQuery): Promise<{
    items: PublicQueueItem[];
    totalItemCount: number;
}> {
    const serverFilter = query.serverId === null ? null : assertServerId(query.serverId);

    const rows = await pg<(PublicEventOrderModel & { server_name: string; position: string })[]>`
        WITH ranked AS (
            SELECT
                o.*,
                s.name AS server_name,
                ROW_NUMBER() OVER (PARTITION BY o.server_id ORDER BY COALESCE(o.queue_order, o.id), o.id)::text AS position
            FROM public_event_orders o
            JOIN public_event_servers s ON s.id = o.server_id
            WHERE o.status IN ('queued','reserved','starting','uncertain')
            AND (${serverFilter}::text IS NULL OR o.server_id = ${serverFilter})
        )
        SELECT *, COUNT(*) OVER ()::text AS total_count
        FROM ranked
        ORDER BY position::bigint, server_id, id
        LIMIT ${query.perPage} OFFSET ${query.page * query.perPage}
    `;

    const total =
        rows[0] === undefined
            ? toNumber(
                  (
                      await pg<{ count: string }[]>`
                SELECT COUNT(*)::text AS count FROM public_event_orders
                WHERE status IN ('queued','reserved','starting','uncertain')
                AND (${serverFilter}::text IS NULL OR server_id = ${serverFilter})
            `
                  )[0]?.count ?? "0",
              )
            : toNumber((rows[0] as unknown as { total_count: string }).total_count);

    return {
        totalItemCount: total,
        items: rows.map((row) => ({
            id: toNumber(row.id),
            eventName: row.event_name,
            serverId: row.server_id,
            serverName: row.server_name,
            purchaserName: row.purchaser_name,
            createdAt: row.created_at.toISOString(),
            status: row.status,
            position: toNumber(row.position),
            repeatDeferral: row.repeat_deferral,
        })),
    };
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

export interface PurchaseInput {
    buyerId: string;
    eventId: number;
    serverId: PublicEventServerId;
    expectedPrice: number;
    requestId: string;
}

export interface PurchaseResult {
    orderId: number;
    balance: number;
    pendingCount: number;
}

export async function purchasePublicEvent(input: PurchaseInput): Promise<PurchaseResult> {
    const payloadHash = await hashPayload({
        eventId: input.eventId,
        serverId: input.serverId,
        expectedPrice: input.expectedPrice,
    });

    return await pgTransaction(async (sql) => {
        // Serialize absent-row retries as well as existing orders, across servers.
        await sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.buyerId}:${input.requestId.toLowerCase()}`}, 0))`;
        const existing = await sql<PublicEventOrderModel[]>`
            SELECT * FROM public_event_orders
            WHERE buyer_id = ${input.buyerId} AND request_id = ${input.requestId}
            FOR UPDATE
        `;

        if (existing[0] !== undefined) {
            const order = existing[0];

            if (order.payload_hash !== payloadHash) {
                throw new ForbiddenError({
                    title: "Conflicting Request",
                    description:
                        "This request ID was already used for a different purchase. Start a new attempt.",
                });
            }

            const balance = await currentBalance(sql, order.steam_id);

            return {
                orderId: toNumber(order.id),
                balance,
                pendingCount: await pendingCountFor(sql, order.server_id),
            };
        }

        const catalog = await sql<PublicEventCatalogModel[]>`
            SELECT * FROM public_event_catalog
            WHERE id = ${input.eventId} AND enabled = TRUE
            FOR SHARE
        `;

        const item = catalog[0];

        if (item === undefined || !isSupportedEventCommand(item.command)) {
            throw new NotFoundError({
                title: "Event Unavailable",
                description:
                    "This event is no longer available, you might need to refresh your page.",
            });
        }

        const cost = toNumber(item.cost);
        const command = validateEventCommand(item.command);
        if (eventComingSoon(command)) {
            throw new ForbiddenError({
                title: "Coming Soon",
                description: "This event is coming soon and cannot be purchased yet.",
            });
        }

        if (cost !== input.expectedPrice) {
            throw new ForbiddenError({
                title: "Mismatched Price",
                description:
                    "The requested price did not match the current price, you might need to refresh your page.",
            });
        }

        if (eventRequiresDonor(command)) await requireEventAccess(input.buyerId);

        const server = await sql<Pick<PublicEventServerModel, "id" | "enabled">[]>`
            SELECT id, enabled FROM public_event_servers WHERE id = ${input.serverId} FOR UPDATE
        `;

        if (server[0] === undefined || !server[0].enabled) {
            throw new ForbiddenError({
                title: "Server Unavailable",
                description: "Purchased events are currently disabled for that server.",
            });
        }

        const user = await sql<{ id: string; username: string; steam_id: string | null }[]>`
            SELECT id, username, steam_id FROM users WHERE id = ${input.buyerId} FOR UPDATE
        `;

        const buyer = user[0];

        if (buyer === undefined) {
            throw new NotFoundError({
                title: "Account Not Found",
                description: "Could not find your account, it may have been deleted.",
            });
        }

        if (buyer.steam_id === null) {
            throw new ForbiddenError({
                title: "No Steam Connection",
                description:
                    "You must link a Steam account to your Discord in order to buy events.",
            });
        }

        const debited = await sql<{ balance: string }[]>`
            UPDATE steam_users
            SET balance = balance - ${cost}, lifetime_purchase_count = lifetime_purchase_count + 1
            WHERE id = ${buyer.steam_id} AND balance >= ${cost}
            RETURNING balance
        `;

        if (debited[0] === undefined) {
            throw new ForbiddenError({
                title: "Not Enough Balance",
                description: "You cannot afford this event.",
            });
        }

        const inserted = await sql<{ id: string }[]>`
            INSERT INTO public_event_orders (
                buyer_id, steam_id, request_id, payload_hash, event_id, server_id,
                event_name, purchaser_name, command, cost, balance_after, status
            ) VALUES (
                ${input.buyerId}, ${buyer.steam_id}, ${input.requestId}, ${payloadHash}, ${item.id}, ${input.serverId},
                ${item.name}, ${buyer.username}, ${command}, ${cost}, ${debited[0].balance}, 'queued'
            )
            RETURNING id
        `;

        const orderId = inserted[0]?.id;

        if (orderId === undefined) {
            throw new Error(`Order insert returned no row for buyer ${input.buyerId}`);
        }

        await selectNonRepeatingOrder(sql, input.serverId);

        return {
            orderId: toNumber(orderId),
            balance: toNumber(debited[0].balance),
            pendingCount: await pendingCountFor(sql, input.serverId),
        };
    });
}

async function currentBalance(sql: TransactionSql, steamId: string): Promise<number> {
    const rows = await sql<
        { balance: string }[]
    >`SELECT balance FROM steam_users WHERE id = ${steamId}`;
    return toNumber(rows[0]?.balance ?? "0");
}

async function pendingCountFor(sql: TransactionSql, serverId: string): Promise<number> {
    const rows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM public_event_orders
        WHERE server_id = ${serverId} AND status IN ('queued','reserved','starting','uncertain')
    `;
    return toNumber(rows[0]?.count ?? "0");
}

// ---------------------------------------------------------------------------
// Plugin round protocol
// ---------------------------------------------------------------------------

export async function heartbeatServer(
    serverId: string,
    pluginTokenId: number,
    instanceId: string,
): Promise<{ ok: true }> {
    await pgTransaction(async (sql) => {
        await lockBoundServer(sql, serverId, pluginTokenId, instanceId);
        await cleanupStaleDeliveries(sql, assertServerId(serverId));
    });

    return { ok: true };
}

export async function reportRound(
    serverId: string,
    pluginTokenId: number,
    instanceId: string,
    roundId: string,
    phase: "prepare" | "started" | "ended",
): Promise<RoundDecision> {
    return await pgTransaction(async (sql) => {
        const id = assertServerId(serverId);
        const server = await lockBoundServer(sql, id, pluginTokenId, instanceId);

        await cleanupStaleDeliveries(sql, id);

        const rounds = await sql<
            PublicEventRoundModel[]
        >`SELECT * FROM public_event_rounds WHERE id = ${roundId}`;
        let round = rounds[0];

        if (phase === "ended") {
            if (round !== undefined && round.server_id !== id) {
                throw new ForbiddenError({
                    title: "Foreign Round",
                    description: "That round ID belongs to another server.",
                });
            }
            return await endRound(sql, server, round, roundId);
        }

        if (round !== undefined && round.server_id !== id) {
            throw new ForbiddenError({
                title: "Foreign Round",
                description: "That round ID belongs to another server.",
            });
        }

        if (
            round !== undefined &&
            (round.phase === "ended" ||
                round.phase === "abandoned" ||
                toNumber(round.number) < toNumber(server.round_number))
        ) {
            return {
                serverId: id,
                roundId,
                roundNumber: toNumber(round.number),
                gapRemaining: await computeGap(
                    sql,
                    id,
                    server.last_paid_round_number === null
                        ? null
                        : toNumber(server.last_paid_round_number),
                ),
                reservation: null,
            };
        }

        const current = server.current_round;

        if (current !== null && current !== roundId) {
            // The plugin moved on without reporting an end. Closing the round as
            // abandoned keeps the queue intact but never counts toward the gap.
            await sql`
                UPDATE public_event_rounds
                SET phase = 'abandoned', ended_at = NULL
                WHERE id = ${current} AND server_id = ${id} AND phase <> 'ended'
            `;
            await cleanupStaleDeliveries(sql, id);
        }

        if (round === undefined) {
            const nextNumber = toNumber(server.round_number) + 1;
            const inserted = await sql<PublicEventRoundModel[]>`
                INSERT INTO public_event_rounds (id, server_id, number, instance_id, phase)
                VALUES (${roundId}, ${id}, ${nextNumber}, ${instanceId}, 'prepare')
                ON CONFLICT (id) DO NOTHING
                RETURNING *
            `;
            round =
                inserted[0] ??
                (
                    await sql<
                        PublicEventRoundModel[]
                    >`SELECT * FROM public_event_rounds WHERE id = ${roundId}`
                )[0]!;
            if (round.server_id !== id) {
                throw new ForbiddenError({
                    title: "Foreign Round",
                    description: "That round ID belongs to another server.",
                });
            }

            if (toNumber(round.number) !== nextNumber) {
                // A concurrent writer already created this round; use its numbering.
                const refetched = await sql<
                    PublicEventRoundModel[]
                >`SELECT * FROM public_event_rounds WHERE id = ${roundId}`;
                round = refetched[0]!;
            } else {
                await sql`
                    UPDATE public_event_servers
                    SET current_round = ${roundId}, round_number = ${nextNumber}
                    WHERE id = ${id}
                `;
                server.current_round = roundId;
                server.round_number = String(nextNumber);
            }
        } else {
            await sql`
                UPDATE public_event_rounds
                SET instance_id = ${instanceId}
                WHERE id = ${roundId}
            `;
            if (server.current_round !== roundId) {
                await sql`
                    UPDATE public_event_servers
                    SET current_round = ${roundId}, round_number = GREATEST(round_number, ${toNumber(round.number)})
                    WHERE id = ${id}
                `;
                server.current_round = roundId;
            }
        }

        if (phase === "started") {
            await sql`
                UPDATE public_event_rounds
                SET phase = 'started', started_at = COALESCE(started_at, NOW())
                WHERE id = ${roundId} AND phase = 'prepare'
            `;
            round.phase = "started";
            if (round.started_at === null) round.started_at = new Date();
        }

        // A prepare refreshes the pre-start lease; a start re-arms it briefly so
        // the plugin has time to call the start endpoint.
        const leaseMs = phase === "started" ? START_WINDOW_MS + 5_000 : PREPARE_LEASE_MS;

        const existing = await sql<PublicEventDeliveryModel[]>`
            SELECT * FROM public_event_deliveries
            WHERE round_id = ${roundId} AND status IN ('reserved','starting','uncertain','started')
            LIMIT 1
        `;

        if (existing[0] !== undefined) {
            await refreshLease(sql, existing[0].id, leaseMs);
            await sql`UPDATE public_event_deliveries SET instance_id = ${instanceId} WHERE id = ${existing[0].id} AND status = 'reserved'`;
        }

        const delivery = await ensureReservation(sql, server, roundId, leaseMs);

        return {
            serverId: id,
            roundId,
            roundNumber: toNumber(round.number),
            gapRemaining: await computeGap(
                sql,
                id,
                server.last_paid_round_number === null
                    ? null
                    : toNumber(server.last_paid_round_number),
            ),
            reservation:
                delivery === null || delivery.status === "started"
                    ? null
                    : await toReservation(sql, delivery),
        };
    });
}

async function endRound(
    sql: TransactionSql,
    server: LockedServer,
    round: PublicEventRoundModel | undefined,
    roundId: string,
): Promise<RoundDecision> {
    const id = server.id;

    if (round === undefined || round.server_id !== id) {
        // An unknown round ending is not an error; the plugin may have started
        // reporting after the API was restored.
        return {
            serverId: id,
            roundId,
            roundNumber: round === undefined ? 0 : toNumber(round.number),
            gapRemaining: await computeGap(
                sql,
                id,
                server.last_paid_round_number === null
                    ? null
                    : toNumber(server.last_paid_round_number),
            ),
            reservation: null,
        };
    }

    if (round.phase !== "ended" && round.phase !== "abandoned") {
        // Reservations that were never authorised definitely did not run.
        await sql`
            UPDATE public_event_deliveries AS d
            SET status = 'expired', message = COALESCE(d.message, 'Round ended before the start was authorised.')
            FROM public_event_orders AS o
            WHERE d.order_id = o.id
            AND o.delivery_id = d.id
            AND d.round_id = ${round.id}
            AND d.status = 'reserved'
            AND o.status IN ('reserved','starting')
        `;

        await sql`
            UPDATE public_event_orders AS o
            SET status = 'queued', message = 'The round ended before the event started; it will be retried on a later round.'
            FROM public_event_deliveries AS d
            WHERE d.order_id = o.id
            AND o.delivery_id = d.id
            AND d.round_id = ${round.id}
            AND d.status = 'expired'
            AND o.status IN ('reserved','starting')
        `;

        await sql`
            UPDATE public_event_rounds
            SET phase = CASE WHEN started_at IS NULL THEN 'abandoned' ELSE 'ended' END,
                ended_at = CASE WHEN started_at IS NULL THEN NULL ELSE COALESCE(ended_at, NOW()) END
            WHERE id = ${round.id} AND phase <> 'ended'
        `;
    }

    if (server.current_round === round.id) {
        await sql`UPDATE public_event_servers SET current_round = NULL WHERE id = ${id}`;
        server.current_round = null;
    }

    const refreshed = await sql<
        PublicEventRoundModel[]
    >`SELECT * FROM public_event_rounds WHERE id = ${round.id}`;
    const finalRound = refreshed[0] ?? round;

    return {
        serverId: id,
        roundId: round.id,
        roundNumber: toNumber(finalRound.number),
        gapRemaining: await computeGap(
            sql,
            id,
            server.last_paid_round_number === null ? null : toNumber(server.last_paid_round_number),
        ),
        reservation: null,
    };
}

// ---------------------------------------------------------------------------
// Plugin start authorisation
// ---------------------------------------------------------------------------

export async function authorizeStart(
    serverId: string,
    pluginTokenId: number,
    instanceId: string,
    orderId: number,
    roundId: string,
    deliveryId: string,
): Promise<{ authorized: true }> {
    await pgTransaction(async (sql) => {
        const id = assertServerId(serverId);
        const server = await lockBoundServer(sql, id, pluginTokenId, instanceId);

        if (server.current_round !== roundId) {
            throw new ForbiddenError({
                title: "Wrong Round",
                description: "That round is not the current round for this server.",
            });
        }

        const rounds = await sql<
            PublicEventRoundModel[]
        >`SELECT * FROM public_event_rounds WHERE id = ${roundId} AND server_id = ${id}`;

        const round = rounds[0];

        if (round === undefined || round.phase !== "started") {
            throw new ForbiddenError({
                title: "Round Not Started",
                description: "The round has not started yet.",
            });
        }

        if (
            round.started_at === null ||
            Date.now() - round.started_at.getTime() > START_WINDOW_MS
        ) {
            throw new ForbiddenError({
                title: "Start Window Passed",
                description: "Events must start within 14 seconds of the round beginning.",
            });
        }

        const deliveries = await sql<
            PublicEventDeliveryModel[]
        >`SELECT * FROM public_event_deliveries WHERE id = ${deliveryId} FOR UPDATE`;

        const delivery = deliveries[0];

        if (
            delivery === undefined ||
            toNumber(delivery.order_id) !== orderId ||
            delivery.round_id !== roundId ||
            delivery.instance_id !== instanceId ||
            round.instance_id !== instanceId ||
            (delivery.status !== "reserved" && delivery.status !== "starting") ||
            (delivery.status === "reserved" && (round.attempted || round.paid))
        ) {
            throw new ForbiddenError({
                title: "Unknown Delivery",
                description: "That delivery is not authorised for this round.",
            });
        }

        if (delivery.status === "reserved" && delivery.lease_until.getTime() < Date.now()) {
            throw new ForbiddenError({
                title: "Reservation Expired",
                description: "The reservation lease expired before the start was authorised.",
            });
        }

        const [order] = await sql<
            PublicEventOrderModel[]
        >`SELECT * FROM public_event_orders WHERE id = ${orderId} FOR UPDATE`;
        if (
            order === undefined ||
            order.delivery_id !== deliveryId ||
            (order.status !== "reserved" && order.status !== "starting")
        ) {
            throw new ForbiddenError({
                title: "Stale Delivery",
                description: "This delivery is no longer the active attempt for this order.",
            });
        }

        if (
            delivery.status === "reserved" &&
            order.command.split(" ")[0] === (await lastStartedCommand(sql, id))
        ) {
            throw new ForbiddenError({
                title: "Repeated Event",
                description:
                    "A different paid event or modifier must run before this command can run again.",
            });
        }

        // Re-authorising an already-authorised delivery is safe: the plugin's own
        // journal decides whether it may execute, so a duplicate response cannot
        // cause a second execution.
        await sql`
            UPDATE public_event_deliveries
            SET status = 'starting',
                authorized_at = COALESCE(authorized_at, NOW()),
                instance_id = ${instanceId},
                lease_until = NOW() + make_interval(secs => ${RESULT_LEASE_MS / 1000})
            WHERE id = ${deliveryId} AND status IN ('reserved','starting')
        `;

        await sql`UPDATE public_event_orders SET status = 'starting' WHERE id = ${orderId} AND status IN ('queued','reserved','starting')`;
        await sql`UPDATE public_event_rounds SET attempted = TRUE WHERE id = ${roundId}`;
    });

    return { authorized: true };
}

// ---------------------------------------------------------------------------
// Plugin result acknowledgement
// ---------------------------------------------------------------------------

const OUTCOME_RANK = { started: 3, uncertain: 2, deferred: 1, expired: 1 } as const;

type OutcomeRankKey = keyof typeof OUTCOME_RANK;

function outcomeRank(status: string, outcome: string | null): number {
    const key: string = status === "started" || status === "uncertain" ? status : (outcome ?? "");
    return key in OUTCOME_RANK ? OUTCOME_RANK[key as OutcomeRankKey] : 0;
}

export async function recordResult(
    serverId: string,
    pluginTokenId: number,
    instanceId: string,
    orderId: number,
    roundId: string,
    deliveryId: string,
    outcome: "started" | "deferred" | "uncertain",
    message: string,
): Promise<{ ok: true }> {
    await pgTransaction(async (sql) => {
        const id = assertServerId(serverId);
        // Results are journal acknowledgements, not permission to execute. They
        // remain valid after instance takeover or disabling the server.
        const server = await lockBoundServer(sql, id, pluginTokenId, null, true);

        const deliveries = await sql<
            PublicEventDeliveryModel[]
        >`SELECT * FROM public_event_deliveries WHERE id = ${deliveryId} FOR UPDATE`;

        const delivery = deliveries[0];

        if (
            delivery === undefined ||
            toNumber(delivery.order_id) !== orderId ||
            delivery.round_id !== roundId ||
            delivery.instance_id !== instanceId ||
            (outcome === "started" && delivery.authorized_at === null)
        ) {
            throw new ForbiddenError({
                title: "Unknown Delivery",
                description: "That delivery does not match this order and round.",
            });
        }

        // A confirmed start can never be downgraded by a late or stale report.
        const currentRank = outcomeRank(delivery.status, delivery.outcome);

        if (outcome !== "started" && delivery.status === "started") {
            return;
        }

        if (outcome === "deferred" && currentRank >= OUTCOME_RANK.uncertain) {
            return;
        }

        const rounds = await sql<
            PublicEventRoundModel[]
        >`SELECT * FROM public_event_rounds WHERE id = ${roundId}`;

        const round = rounds[0];

        if (round === undefined || round.server_id !== id) {
            throw new ForbiddenError({
                title: "Wrong Round",
                description: "That round does not belong to this server.",
            });
        }

        const orders = await sql<
            PublicEventOrderModel[]
        >`SELECT * FROM public_event_orders WHERE id = ${orderId} FOR UPDATE`;

        const order = orders[0];

        if (order === undefined) {
            throw new NotFoundError({
                title: "Order Not Found",
                description: "That order no longer exists.",
            });
        }

        if (order.status === "fulfilled" || order.status === "cancelled") {
            // Late acknowledgements must never resurrect terminal orders.
            return;
        }

        if (order.delivery_id !== deliveryId && outcome !== "started") return;

        await sql`
            UPDATE public_event_deliveries
            SET status = ${outcome === "started" ? "started" : outcome === "uncertain" ? "uncertain" : "deferred"},
                outcome = ${outcome},
                message = ${message},
                result_instance = ${instanceId}
            WHERE id = ${deliveryId}
        `;

        if (outcome === "started") {
            await sql`
                UPDATE public_event_orders SET status = 'fulfilled', message = ${message}
                WHERE id = ${orderId}
            `;
            await sql`UPDATE public_event_rounds SET paid = TRUE WHERE id = ${roundId}`;

            // Never let a late report move the marker backwards.
            await sql`
                UPDATE public_event_servers
                SET last_paid_round_number = GREATEST(COALESCE(last_paid_round_number, 0), ${toNumber(round.number)})
                WHERE id = ${id}
            `;
            server.last_paid_round_number = String(
                Math.max(
                    server.last_paid_round_number === null
                        ? 0
                        : toNumber(server.last_paid_round_number),
                    toNumber(round.number),
                ),
            );
        } else if (outcome === "uncertain") {
            await sql`
                UPDATE public_event_orders
                SET status = 'uncertain', message = ${message || "Execution outcome is unknown; staff must reconcile this order."}
                WHERE id = ${orderId}
            `;
        } else {
            await sql`
                UPDATE public_event_orders
                SET status = 'queued', message = ${message || "The event did not start and will be retried on a later round."}
                WHERE id = ${orderId} AND status IN ('queued','reserved','starting','uncertain')
            `;
            await sql`UPDATE public_event_rounds SET attempted = TRUE WHERE id = ${roundId}`;
        }
        await selectNonRepeatingOrder(sql, id);
    });

    return { ok: true };
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export interface AdminCatalogItem {
    category: PublicEventCategory;
    requiresDonor: boolean;
    requiresStaff: boolean;
    comingSoon: boolean;
    supported: boolean;
    id: number;
    name: string;
    description: string;
    image: string | null;
    cost: number;
    command: string;
    enabled: boolean;
}

function formatAdminCatalog(row: PublicEventCatalogModel): AdminCatalogItem {
    return {
        category: row.category,
        requiresDonor: eventRequiresDonor(row.command),
        requiresStaff: false,
        comingSoon: eventComingSoon(row.command),
        supported: isSupportedEventCommand(row.command),
        id: toNumber(row.id),
        name: row.name,
        description: row.description,
        image: row.image,
        cost: toNumber(row.cost),
        command: row.command,
        enabled: row.enabled,
    };
}

export async function getAdminCatalog(): Promise<AdminCatalogItem[]> {
    return (
        await pg<PublicEventCatalogModel[]>`SELECT * FROM public_event_catalog ORDER BY id`
    ).map(formatAdminCatalog);
}

export interface CatalogPayload {
    category: PublicEventCategory;
    name: string;
    description: string;
    image: string | null;
    cost: number;
    command: string;
    enabled: boolean;
}

export async function createCatalogItem(payload: CatalogPayload): Promise<AdminCatalogItem> {
    const command = validateCatalogCommand(payload.command, payload.enabled);

    const rows = await pg<PublicEventCatalogModel[]>`
        INSERT INTO public_event_catalog (name, description, image, cost, command, enabled, category)
        VALUES (${payload.name}, ${payload.description}, ${payload.image}, ${payload.cost}, ${command}, ${payload.enabled}, ${payload.category})
        RETURNING *
    `;

    return formatAdminCatalog(rows[0]!);
}

export async function updateCatalogItem(
    id: number,
    payload: CatalogPayload,
): Promise<AdminCatalogItem> {
    const command = validateCatalogCommand(payload.command, payload.enabled);

    const rows = await pg<PublicEventCatalogModel[]>`
        UPDATE public_event_catalog
        SET name = ${payload.name}, description = ${payload.description}, image = ${payload.image},
            cost = ${payload.cost}, command = ${command}, enabled = ${payload.enabled}, category = ${payload.category}
        WHERE id = ${id}
        RETURNING *
    `;

    const updated = rows[0];

    if (updated === undefined) {
        throw new NotFoundError({
            title: "Event Not Found",
            description: "No purchased event catalog entry with that ID exists.",
        });
    }

    return formatAdminCatalog(updated);
}

export interface AdminServerRow extends BoundServer {
    pluginTokenId: number | null;
    currentRound: string | null;
    roundNumber: number;
    lastPaidRoundNumber: number | null;
}

export async function getAdminServers(): Promise<AdminServerRow[]> {
    return await pgTransaction(async (sql) => {
        const rows = await listServerRows(sql);

        const now = Date.now();

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            enabled: row.enabled,
            online: row.instance_until !== null && row.instance_until.getTime() > now,
            pendingCount: row.pendingCount,
            gapRemaining: row.gapRemaining,
            pluginTokenId: row.pluginTokenId,
            currentRound: row.currentRound,
            roundNumber: row.roundNumber,
            lastPaidRoundNumber: row.lastPaidRoundNumber,
        }));
    });
}

export async function updateAdminServer(
    id: string,
    payload: { enabled: boolean; pluginTokenId: number | null },
): Promise<AdminServerRow> {
    const serverId = assertServerId(id);

    await pgTransaction(async (sql) => {
        if (payload.pluginTokenId !== null) {
            const tokens = await sql<{ id: string }[]>`
                SELECT id FROM plugin_tokens WHERE id = ${payload.pluginTokenId}
            `;

            if (tokens[0] === undefined) {
                throw new NotFoundError({
                    title: "Token Not Found",
                    description: "That plugin token does not exist.",
                });
            }
        }

        // Disabling or rebinding must not leave a live scheduler authoritative.
        const updated = await sql<{ id: string }[]>`
            UPDATE public_event_servers
            SET enabled = ${payload.enabled},
                plugin_token_id = ${payload.pluginTokenId},
                instance_id = CASE WHEN NOT ${payload.enabled} OR ${payload.pluginTokenId} IS DISTINCT FROM plugin_token_id THEN NULL ELSE instance_id END,
                instance_until = CASE WHEN NOT ${payload.enabled} OR ${payload.pluginTokenId} IS DISTINCT FROM plugin_token_id THEN NULL ELSE instance_until END
            WHERE id = ${serverId}
            RETURNING id
        `;

        if (updated[0] === undefined) {
            throw new NotFoundError({
                title: "Server Not Found",
                description: "That server does not exist.",
            });
        }
    });

    const servers = await getAdminServers();
    const server = servers.find((x) => x.id === serverId);

    if (server === undefined) {
        throw new Error(`Server ${serverId} vanished after update`);
    }

    return server;
}

export async function getAdminOrders(
    query: QueueQuery,
): Promise<{ items: AdminOrderItem[]; totalItemCount: number }> {
    const serverFilter = query.serverId === null ? null : assertServerId(query.serverId);

    const counted = await pg<{ total: string }[]>`
        SELECT COUNT(*)::text AS total
        FROM public_event_orders o
        WHERE (${serverFilter}::text IS NULL OR o.server_id = ${serverFilter})
    `;

    const total = toNumber(counted[0]?.total ?? "0");

    const rows = await pg<(PublicEventOrderModel & { server_name: string; position: string })[]>`
        WITH pending_positions AS (
            SELECT
                o.id,
                ROW_NUMBER() OVER (PARTITION BY o.server_id ORDER BY COALESCE(o.queue_order, o.id), o.id)::text AS position
            FROM public_event_orders o
            WHERE o.status IN ('queued','reserved','starting','uncertain')
        )
        SELECT o.*, s.name AS server_name,
            COALESCE(p.position, ROW_NUMBER() OVER (PARTITION BY o.server_id ORDER BY o.id)::text) AS position
        FROM public_event_orders o
        JOIN public_event_servers s ON s.id = o.server_id
        LEFT JOIN pending_positions p ON p.id = o.id
        WHERE (${serverFilter}::text IS NULL OR o.server_id = ${serverFilter})
        ORDER BY o.id
        LIMIT ${query.perPage} OFFSET ${query.page * query.perPage}
    `;

    if (rows.length === 0) return { items: [], totalItemCount: total };

    const orderIds = rows.map((row) => toNumber(row.id));

    const deliveries = await pg<(PublicEventDeliveryModel & { round_number: string })[]>`
        SELECT DISTINCT ON (d.order_id) d.*, r.number AS round_number
        FROM public_event_deliveries d
        JOIN public_event_rounds r ON r.id = d.round_id
        WHERE d.order_id = ANY(${bunSql.array(orderIds, "INTEGER")})
        ORDER BY d.order_id, d.created_at DESC
    `;

    const audits = await pg<
        { order_id: string; actor_id: string; outcome: string; reason: string; created_at: Date }[]
    >`
        SELECT order_id, actor_id, outcome, reason, created_at
        FROM public_event_audit
        WHERE order_id = ANY(${bunSql.array(orderIds, "INTEGER")})
        ORDER BY created_at DESC
    `;

    const deliveryMap = new Map(deliveries.map((row) => [toNumber(row.order_id), row]));
    const auditMap = new Map<number, AdminOrderItem["audits"]>();

    for (const row of audits) {
        const key = toNumber(row.order_id);
        const list = auditMap.get(key) ?? [];
        list.push({
            actorId: row.actor_id,
            outcome: row.outcome,
            reason: row.reason,
            createdAt: row.created_at.toISOString(),
        });
        auditMap.set(key, list);
    }

    return {
        totalItemCount: total,
        items: rows.map((row) => {
            const id = toNumber(row.id);
            const delivery = deliveryMap.get(id);

            return {
                id,
                buyerId: row.buyer_id,
                eventName: row.event_name,
                command: row.command,
                serverId: row.server_id,
                serverName: row.server_name,
                purchaserName: row.purchaser_name,
                cost: toNumber(row.cost),
                balanceAfter: toNumber(row.balance_after),
                createdAt: row.created_at.toISOString(),
                status: row.status,
                position: toNumber(row.position),
                repeatDeferral: row.repeat_deferral,
                message: row.message,
                delivery:
                    delivery === undefined
                        ? null
                        : {
                              id: delivery.id,
                              roundId: delivery.round_id,
                              roundNumber: toNumber(delivery.round_number),
                              instanceId: delivery.instance_id,
                              status: delivery.status,
                              leaseUntil: delivery.lease_until.toISOString(),
                              authorizedAt:
                                  delivery.authorized_at === null
                                      ? null
                                      : delivery.authorized_at.toISOString(),
                              outcome: delivery.outcome,
                              message: delivery.message,
                          },
                audits: auditMap.get(id) ?? [],
            };
        }),
    };
}

export async function reconcileOrder(
    id: number,
    actorId: string,
    outcome: "started" | "retry",
    reason: string,
): Promise<{ ok: true }> {
    await pgTransaction(async (sql) => {
        if (!reason.trim()) {
            throw new ForbiddenError({
                title: "Reason Required",
                description: "A non-blank reconciliation reason is required.",
            });
        }
        // Match the plugin lock order: server, then delivery/order.
        const [target] = await sql<
            Pick<PublicEventOrderModel, "server_id">[]
        >`SELECT server_id FROM public_event_orders WHERE id = ${id}`;
        if (target !== undefined)
            await sql`SELECT id FROM public_event_servers WHERE id = ${target.server_id} FOR UPDATE`;
        const orders = await sql<
            PublicEventOrderModel[]
        >`SELECT * FROM public_event_orders WHERE id = ${id} FOR UPDATE`;

        const order = orders[0];

        if (order === undefined) {
            throw new NotFoundError({
                title: "Order Not Found",
                description: "That order does not exist.",
            });
        }

        if (
            order.status !== "uncertain" &&
            order.status !== "starting" &&
            order.status !== "reserved"
        ) {
            throw new ForbiddenError({
                title: "Order Not Stuck",
                description: "Only reserved, starting, or uncertain orders can be reconciled.",
            });
        }

        if (order.delivery_id === null) {
            throw new ForbiddenError({
                title: "No Delivery",
                description: "This order has never been reserved for a round.",
            });
        }

        const deliveries = await sql<
            PublicEventDeliveryModel[]
        >`SELECT * FROM public_event_deliveries WHERE id = ${order.delivery_id}`;

        const delivery = deliveries[0];

        if (delivery === undefined) {
            throw new NotFoundError({
                title: "Delivery Not Found",
                description: "The delivery for this order no longer exists.",
            });
        }

        if (outcome === "started") {
            await sql`
                UPDATE public_event_deliveries
                SET status = 'started', outcome = 'started', message = ${`Confirmed by staff: ${reason}`}
                WHERE id = ${delivery.id}
            `;
            await sql`UPDATE public_event_orders SET status = 'fulfilled', message = ${`Confirmed by staff: ${reason}`} WHERE id = ${id}`;

            const rounds = await sql<{ number: string; server_id: string }[]>`
                SELECT number, server_id FROM public_event_rounds WHERE id = ${delivery.round_id}
            `;

            if (rounds[0] !== undefined) {
                await sql`UPDATE public_event_rounds SET paid = TRUE WHERE id = ${delivery.round_id}`;
                await sql`
                    UPDATE public_event_servers
                    SET last_paid_round_number = GREATEST(COALESCE(last_paid_round_number, 0), ${toNumber(rounds[0].number)})
                    WHERE id = ${rounds[0].server_id}
                `;
            }
        } else {
            await sql`
                UPDATE public_event_deliveries
                SET status = 'expired', outcome = 'deferred', message = ${`Staff retried: ${reason}`}
                WHERE id = ${delivery.id} AND status <> 'started'
            `;
            await sql`
                UPDATE public_event_orders
                SET status = 'queued', message = ${`Staff returned this order to the queue: ${reason}`}
                WHERE id = ${id} AND status IN ('queued','reserved','starting','uncertain')
            `;
        }

        await sql`
            INSERT INTO public_event_audit (order_id, delivery_id, actor_id, outcome, reason)
            VALUES (${id}, ${delivery.id}, ${actorId}, ${outcome}, ${reason})
        `;
        await selectNonRepeatingOrder(sql, order.server_id);
    });

    return { ok: true };
}

export async function cancelOrder(
    id: number,
    actorId: string,
    reason: string,
): Promise<{ ok: true }> {
    if (!reason.trim() || reason.length > 2000) {
        throw new ForbiddenError({
            title: "Reason Required",
            description: "A non-blank cancellation reason of at most 2000 characters is required.",
        });
    }
    await pgTransaction(async (sql) => {
        // Serialize with reservation, authorization, reconciliation, and results.
        const [target] = await sql<Pick<PublicEventOrderModel, "server_id">[]>`
            SELECT server_id FROM public_event_orders WHERE id = ${id}
        `;
        if (target !== undefined)
            await sql`SELECT id FROM public_event_servers WHERE id = ${target.server_id} FOR UPDATE`;
        const [order] = await sql<PublicEventOrderModel[]>`
            SELECT * FROM public_event_orders WHERE id = ${id} FOR UPDATE
        `;
        if (order === undefined) {
            throw new NotFoundError({
                title: "Order Not Found",
                description: "That order does not exist.",
            });
        }
        if (order.status !== "queued") {
            throw new ForbiddenError({
                title: "Order Not Queued",
                description:
                    "Only queued orders can be removed without refund. Refresh the queue before taking further action.",
            });
        }
        // Even an expired/retried historical authorization may report a late start.
        const authorized = await sql<{ id: string }[]>`
            SELECT id FROM public_event_deliveries
            WHERE order_id = ${id} AND authorized_at IS NOT NULL LIMIT 1
        `;
        if (authorized.length > 0) {
            throw new ForbiddenError({
                title: "Previously Authorized",
                description:
                    "This order has a historically authorized delivery and cannot safely be removed. Staff must verify its execution history.",
            });
        }
        await sql`
            UPDATE public_event_orders
            SET status = 'cancelled', repeat_deferral = 'none', message = ${`Removed by staff without refund: ${reason.trim()}`}
            WHERE id = ${id}
        `;
        await sql`
            INSERT INTO public_event_audit (order_id, delivery_id, actor_id, outcome, reason)
            VALUES (${id}, ${order.delivery_id}, ${actorId}, 'cancelled', ${reason.trim()})
        `;
        await selectNonRepeatingOrder(sql, order.server_id);
    });
    return { ok: true };
}

/** Command vocabulary exposed to staff tooling so the UI cannot drift. */
export function listCommandKeys(): string[] {
    return listPublicEventCommands();
}
