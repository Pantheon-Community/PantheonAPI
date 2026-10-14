import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { relative } from "node:path";
import { SQL } from "bun";
import { mockBotsRoles } from "../fixtures/botsRoles";
import { runPluginHttpFixture } from "./pluginHttpFixture";
import { ForbiddenError } from "@/errors/ForbiddenError";
import { ServiceUnavailableError } from "@/errors/ServiceUnavailableError";
import { setPostgres } from "@/global/pg";
import { createPublicEventsTables } from "@/models/PublicEventModel";
import { PUBLIC_EVENT_PRICE_SHEET, seedPublicEventCatalog } from "@/services/publicEventSeed";
import {
    authorizeStart,
    createCatalogItem,
    getAdminCatalog,
    getAdminOrders,
    getAdminServers,
    getPublicCatalog,
    getPublicQueue,
    getPublicServers,
    heartbeatServer,
    purchasePublicEvent,
    reconcileOrder,
    recordResult,
    reportRound,
    updateAdminServer,
    updateCatalogItem,
} from "@/services/publicEvents";

// This is deliberately not a *.test.ts file: ordinary bun test/check-all must
// never connect to a database. Only this explicit, disposable URL is accepted.
const rawUrl = process.env["PAID_EVENTS_DISPOSABLE_URL"];
assert(rawUrl, "Set PAID_EVENTS_DISPOSABLE_URL explicitly; no DATABASE_URL fallback is allowed.");
const url = new URL(rawUrl);
assert.equal(url.protocol, "postgresql:");
assert.equal(url.hostname, "127.0.0.1");
assert(Number(url.port) >= 49152 && Number(url.port) <= 65535, "Use a dedicated high port.");
assert.equal(url.username, "paid_events_test");
assert.equal(url.password, "");
assert.equal(url.pathname, "/pantheon_paid_events_disposable");
assert.equal(url.search, "");
assert.equal(url.hash, "");

const db = new SQL(rawUrl, { max: 12, connectionTimeout: 5 });
let passed = 0;
let eventId = 0;
const instance = crypto.randomUUID();
const query = { page: 0, perPage: 100, serverId: null } as const;
const bots = mockBotsRoles();

async function purchase(
    serverId: "1" | "2" = "1",
    buyerId = "buyer",
    requestId = crypto.randomUUID(),
): Promise<number> {
    return (await purchasePublicEvent({ buyerId, eventId, serverId, expectedPrice: 10, requestId }))
        .orderId;
}

async function runCase(name: string, work: () => Promise<void>): Promise<void> {
    bots.fetchMock.mockImplementation(async () =>
        Response.json([{ role: "donator", other_roles: [] }]),
    );
    // Every case owns a fresh fixture in this already-verified disposable DB.
    await db.unsafe(`
        TRUNCATE public_event_audit, public_event_deliveries, public_event_orders,
            public_event_rounds, public_event_catalog, public_event_servers,
            users, steam_users, plugin_tokens RESTART IDENTITY CASCADE;
        INSERT INTO steam_users (id, balance) VALUES ('steam', 100);
        INSERT INTO users (id, username, steam_id)
            VALUES ('buyer', 'Synthetic Buyer', 'steam'), ('alias', 'Synthetic Alias', 'steam'), ('unlinked', 'Unlinked', NULL);
        INSERT INTO plugin_tokens DEFAULT VALUES;
        INSERT INTO plugin_tokens DEFAULT VALUES;
        INSERT INTO plugin_tokens DEFAULT VALUES;
        INSERT INTO public_event_servers (id, name) VALUES ('1', 'Synthetic #1'), ('2', 'Synthetic #2');
    `);
    await updateAdminServer("1", { enabled: true, pluginTokenId: 1 });
    await updateAdminServer("2", { enabled: true, pluginTokenId: 2 });
    eventId = (
        await createCatalogItem({
            name: "Synthetic Event",
            category: "pvp",
            description: "Fixture",
            image: null,
            cost: 10,
            command: "traitor",
            enabled: true,
        })
    ).id;
    await work();
    passed++;
    console.log(`PASS ${name}`);
}

try {
    await db.connect();
    // Verify the server's actual storage before any DDL, not just its URL.
    const [settings] = await db<{ data_directory: string }[]>`SHOW data_directory`;
    assert(settings);
    const approved = realpathSync("/var/folders/rk/sm2_j57s1m5c4lfkk36rqq7h0000gn/T/opencode");
    const directory = realpathSync(settings.data_directory);
    assert(
        /^paid-events-pg-[a-zA-Z0-9]+\/data$/.test(relative(approved, directory)),
        "Server storage must be an isolated paid-events-pg-* cluster under the approved temp directory.",
    );
    const [existing] = await db<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND n.nspname NOT LIKE 'pg_toast%'
        AND c.relkind IN ('r', 'p')
    `;
    assert.equal(
        existing?.count,
        "0",
        "Refusing to alter a non-empty database; recreate the disposable database.",
    );
    setPostgres(db);
    await db.unsafe(`
        CREATE TABLE steam_users (id TEXT PRIMARY KEY, balance INTEGER NOT NULL CHECK(balance >= 0), lifetime_purchase_count INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL, steam_id TEXT REFERENCES steam_users(id));
        CREATE TABLE plugin_tokens (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY);
        CREATE TABLE public_event_catalog (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name TEXT NOT NULL,
            description TEXT NOT NULL, image TEXT, cost INTEGER NOT NULL CHECK(cost >= 0),
            command TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT FALSE
        );
        INSERT INTO public_event_catalog (name, description, cost, command, enabled)
            VALUES ('Old Bird', 'Keep description', 5, '/BIRDISTHEWORD', FALSE),
                   ('Staff Traitor', '', 27, 'traitor', TRUE);
    `);
    await createPublicEventsTables();
    const seeded = await getAdminCatalog();
    assert.equal(seeded.length, 34);
    for (const [command, name, cost, category] of PUBLIC_EVENT_PRICE_SHEET) {
        const matches = seeded.filter(
            (row) => row.command.replace(/^\/+/, "").toLowerCase() === command,
        );
        assert.equal(matches.length, 1);
        assert.equal(matches[0]?.name, name);
        assert.equal(matches[0]?.cost, cost);
        assert.equal(matches[0]?.category, category);
        assert.equal(matches[0]?.enabled, matches[0]?.supported);
    }
    assert.equal(seeded[0]?.id, 1);
    assert.equal(seeded[0]?.description, "Keep description");
    assert.equal(seeded[1]?.cost, 27);
    assert.equal(seeded[1]?.enabled, true);
    assert.equal(seeded.filter((row) => !row.supported).length, 5);
    assert.equal((await getPublicCatalog()).length, 23);
    const bird = seeded[0];
    const staffBird = await updateCatalogItem(bird.id, {
        ...bird,
        name: "Staff Bird",
        cost: 42,
        category: "survival",
        enabled: false,
    });
    await createPublicEventsTables();
    assert.deepEqual((await getAdminCatalog())[0], staffBird);
    console.log(
        "PASS legacy category migration, exact sheet, no duplicates, and staff edits survive bootstrap",
    );
    passed++;

    await runCase("v1-to-v2 price-only upgrade preserves staff fields and snapshots", async () => {
        const revised = [
            ["hangthedj", 1500, 1800],
            ["micromanagement", 2000, 1800],
            ["leapfrog", 1000, 1800],
            ["murderinthedark", 3000, 2500],
            ["nukerun", 1000, 1200],
            ["cockfights", 3000, 2500],
            ["dodgeball", 2500, 2000],
            ["musicalchairs", 3000, 2800],
            ["tag", 3000, 2000],
            ["tiny", 1500, 1800],
        ] as const;
        await db`DELETE FROM public_event_bootstrap WHERE key = 'categorized-price-sheet-v2'`;
        assert.equal(
            (
                await db`SELECT key FROM public_event_bootstrap WHERE key = 'categorized-price-sheet-v1'`
            ).length,
            1,
        );
        await db`UPDATE public_event_catalog SET command = 'tiny', cost = 1500 WHERE id = ${eventId}`;
        await db`UPDATE steam_users SET balance = 10000`;
        await purchasePublicEvent({
            buyerId: "buyer",
            eventId,
            serverId: "1",
            expectedPrice: 1500,
            requestId: crypto.randomUUID(),
        });
        const ordersBefore = await db`SELECT * FROM public_event_orders ORDER BY id`;
        await db`UPDATE public_event_catalog SET enabled = FALSE WHERE id = ${eventId}`;
        for (const [command, oldCost] of revised) {
            // eslint-disable-next-line no-await-in-loop
            await db`INSERT INTO public_event_catalog (name, description, image, cost, command, enabled, category)
                VALUES (${`Staff ${command}`}, 'Staff description', 'https://synthetic.invalid/image',
                    ${oldCost}, ${`  //${command.toUpperCase()}  `}, FALSE, 'modifier')`;
        }
        await db`INSERT INTO public_event_catalog (name, description, cost, command, enabled, category)
            VALUES ('Staff song', '', 77, 'hangthedj song', FALSE, 'pvp'),
                   ('Staff unchanged', '', 88, 'birdistheword', FALSE, 'survival'),
                   ('Staff custom', '', 99, 'custom', FALSE, 'minigame')`;
        const before = await db<{ command: string; cost: number; [key: string]: unknown }[]>`
            SELECT * FROM public_event_catalog ORDER BY id`;
        await Promise.all(Array.from({ length: 8 }, () => seedPublicEventCatalog()));
        const after = await db`SELECT * FROM public_event_catalog ORDER BY id`;
        assert.equal(after.length, before.length);
        for (const [index, row] of before.entries()) {
            const command = row.command.trim().toLowerCase().replace(/^\/+/, "");
            const price = revised.find(([base]) => base === command)?.[2];
            assert.deepEqual(after[index], price === undefined ? row : { ...row, cost: price });
        }
        assert.deepEqual(await db`SELECT * FROM public_event_orders ORDER BY id`, ordersBefore);
        assert.equal(
            (
                await db`SELECT key FROM public_event_bootstrap WHERE key = 'categorized-price-sheet-v2'`
            ).length,
            1,
        );
        await db`UPDATE public_event_catalog SET cost = 42 WHERE id = ${eventId}`;
        const staffEdited = await db`SELECT * FROM public_event_catalog ORDER BY id`;
        await createPublicEventsTables();
        assert.deepEqual(await db`SELECT * FROM public_event_catalog ORDER BY id`, staffEdited);
        assert.deepEqual(await db`SELECT * FROM public_event_orders ORDER BY id`, ordersBefore);
    });

    await runCase(
        "production descriptions replace blanks and old placeholders without overwriting staff copy",
        async () => {
            await db`DELETE FROM public_event_bootstrap WHERE key = 'catalog-descriptions-v1'`;
            await db`UPDATE public_event_catalog SET description = 'Staff-written copy' WHERE id = ${eventId}`;
            const blank = await createCatalogItem({
                name: "Tiny",
                category: "modifier",
                command: "tiny",
                cost: 10,
                enabled: true,
                description: "",
                image: null,
            });
            const placeholder = await createCatalogItem({
                name: "Dodgeball",
                category: "minigame",
                command: "dodgeball",
                cost: 10,
                enabled: true,
                description: "Local demo fixture. No real event will run.",
                image: null,
            });
            const variant = await createCatalogItem({
                name: "Song",
                category: "pvp",
                command: "hangthedj 2",
                cost: 10,
                enabled: true,
                description: " ",
                image: null,
            });
            await purchase();
            const before = await db`SELECT * FROM public_event_orders`;
            await Promise.all(Array.from({ length: 6 }, () => seedPublicEventCatalog()));
            const catalog = await getAdminCatalog();
            assert.equal(
                catalog.find((row) => row.id === eventId)?.description,
                "Staff-written copy",
            );
            assert.equal(
                catalog.find((row) => row.id === blank.id)?.description,
                "Shrink players for a round with a much smaller perspective.",
            );
            assert.equal(
                catalog.find((row) => row.id === placeholder.id)?.description,
                "Dodge bouncing SCP-018s and outlast your opponents in the arena.",
            );
            assert.equal(
                catalog.find((row) => row.id === variant.id)?.description,
                "Hunt down the DJ and stop the music in this team battle.",
            );
            assert.deepEqual(await db`SELECT * FROM public_event_orders`, before);
            await db`UPDATE public_event_catalog SET description = '' WHERE id = ${blank.id}`;
            await createPublicEventsTables();
            assert.equal(
                (await getAdminCatalog()).find((row) => row.id === blank.id)?.description,
                "",
            );
        },
    );

    await runCase(
        "placeholders stay administrative and bootstrap preserves queued snapshots",
        async () => {
            await purchase();
            const before = (await getAdminOrders(query)).items[0];
            await db`DELETE FROM public_event_bootstrap`;
            await Promise.all(Array.from({ length: 8 }, () => seedPublicEventCatalog()));
            assert.equal((await getAdminCatalog()).length, 34);
            assert.deepEqual((await getAdminOrders(query)).items[0], before);
            const placeholder = (await getAdminCatalog()).find(
                (row) => row.command === "walkingdead",
            )!;
            assert.equal(placeholder.supported, false);
            assert.equal(placeholder.category, "modifier");
            await updateCatalogItem(placeholder.id, { ...placeholder, cost: 1234, enabled: false });
            await assert.rejects(
                updateCatalogItem(placeholder.id, { ...placeholder, enabled: true }),
            );
            await assert.rejects(createCatalogItem({ ...placeholder, enabled: true }));
            await db`UPDATE public_event_catalog SET enabled = TRUE WHERE id = ${placeholder.id}`;
            assert(!(await getPublicCatalog()).some((row) => row.id === placeholder.id));
            await assert.rejects(
                purchasePublicEvent({
                    buyerId: "buyer",
                    eventId: placeholder.id,
                    serverId: "1",
                    expectedPrice: 1234,
                    requestId: crypto.randomUUID(),
                }),
            );
            assert.equal((await db`SELECT balance FROM steam_users`)[0].balance, 90);
            await createPublicEventsTables();
            assert.equal(
                (await getAdminCatalog()).find((row) => row.id === placeholder.id)?.cost,
                1234,
            );
        },
    );

    await runCase(
        "concurrent idempotency, conflicting payloads, and rollback after debit",
        async () => {
            const requestId = crypto.randomUUID();
            const ids = await Promise.all(
                Array.from({ length: 24 }, () => purchase("1", "buyer", requestId)),
            );
            assert.equal(new Set(ids).size, 1);
            assert.deepEqual(
                (await db`SELECT balance, lifetime_purchase_count FROM steam_users`)[0],
                { balance: 90, lifetime_purchase_count: 1 },
            );
            const conflictId = crypto.randomUUID();
            const conflicts = await Promise.allSettled([
                purchase("1", "buyer", conflictId),
                purchase("2", "buyer", conflictId),
            ]);
            assert.equal(conflicts.filter((r) => r.status === "fulfilled").length, 1);
            assert.equal(conflicts.filter((r) => r.status === "rejected").length, 1);
            for (const result of conflicts) {
                if (result.status === "rejected") {
                    assert(result.reason instanceof Error);
                    assert.match(
                        result.reason.message,
                        /request ID was already used for a different purchase/,
                    );
                }
            }
            await assert.rejects(purchase("1", "unlinked"));
            await assert.rejects(
                purchasePublicEvent({
                    buyerId: "buyer",
                    eventId,
                    serverId: "1",
                    expectedPrice: 9,
                    requestId: crypto.randomUUID(),
                }),
            );
            // Invalid stored commands are rejected before charging.
            await db`UPDATE public_event_catalog SET command = 'stop' WHERE id = ${eventId}`;
            await assert.rejects(purchase());
            await db`UPDATE public_event_catalog SET command = 'traitor' WHERE id = ${eventId}`;
            // Force an order-insert failure after the debit to verify transaction rollback.
            await db`ALTER TABLE public_event_orders ADD CONSTRAINT integration_debit_rollback CHECK(cost <> 10) NOT VALID`;
            await assert.rejects(purchase());
            await db`ALTER TABLE public_event_orders DROP CONSTRAINT integration_debit_rollback`;
            assert.deepEqual(
                (await db`SELECT balance, lifetime_purchase_count FROM steam_users`)[0],
                { balance: 80, lifetime_purchase_count: 2 },
            );
            assert.equal(
                (await db`SELECT COUNT(*)::int AS count FROM public_event_orders`)[0].count,
                2,
            );
        },
    );

    await runCase(
        "modifiers use the existing purchase and reservation contract without Bots",
        async () => {
            await db`UPDATE public_event_catalog SET command = 'tiny', category = 'modifier' WHERE id = ${eventId}`;
            delete process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"];
            const calls = bots.fetchMock.mock.calls.length;
            const orderId = await purchase();
            assert.equal(bots.fetchMock.mock.calls.length, calls);
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"] = "https://synthetic-bots.invalid";
            const decision = await reportRound("1", 1, instance, crypto.randomUUID(), "prepare");
            assert.equal(decision.reservation?.orderId, orderId);
            assert.equal(decision.reservation?.command, "tiny");
            assert.equal((await getAdminCatalog())[0]?.supported, true);
            assert.equal((await getPublicCatalog())[0]?.category, "modifier");
            assert.equal((await getPublicCatalog())[0]?.requiresDonor, false);
            assert.equal((await getAdminCatalog())[0]?.requiresDonor, false);
        },
    );

    await runCase(
        "persisted Everything Explodes is unavailable even to staff and preserves history",
        async () => {
            const requestId = crypto.randomUUID();
            const orderId = await purchase("1", "buyer", requestId);
            // Model a purchase made before the command was removed.
            await db`UPDATE public_event_orders SET command = 'everythingexplodes', event_name = 'Everything Explodes' WHERE id = ${orderId}`;
            await db`UPDATE public_event_catalog SET command = '/EVERYTHINGEXPLODES', category = 'survival', name = 'Renamed modifier' WHERE id = ${eventId}`;
            assert.equal((await getPublicCatalog()).length, 0);
            const legacy = (await getAdminCatalog())[0]!;
            assert.equal(legacy.enabled, true);
            assert.equal(legacy.supported, false);
            assert.equal(legacy.requiresStaff, false);
            await assert.rejects(createCatalogItem({ ...legacy, enabled: true }));
            await assert.rejects(updateCatalogItem(eventId, { ...legacy, enabled: false }));
            const before = await db`SELECT * FROM public_event_orders`;
            const catalogBefore = await db`SELECT * FROM public_event_catalog WHERE id = ${eventId}`;
            await db`DELETE FROM public_event_bootstrap`;
            await seedPublicEventCatalog();
            assert.deepEqual(await db`SELECT * FROM public_event_orders`, before);
            assert.deepEqual(
                await db`SELECT * FROM public_event_catalog WHERE id = ${eventId}`,
                catalogBefore,
            );
            assert(!(await getPublicCatalog()).some((row) => row.id === eventId));
            const input = {
                buyerId: "buyer",
                eventId,
                serverId: "1",
                expectedPrice: 10,
                requestId: crypto.randomUUID(),
                isStaff: true,
                requiresStaff: false,
            } as const;
            const calls = bots.fetchMock.mock.calls.length;
            for (const role of ["member", "donator", "d5mega", "tmoderator", "owner"]) {
                bots.fetchMock.mockImplementation(async () =>
                    Response.json([{ role, other_roles: [] }]),
                );
                // eslint-disable-next-line no-await-in-loop
                await assert.rejects(purchasePublicEvent(input), {
                    name: "NotFoundError",
                    message: "This event is no longer available, you might need to refresh your page.",
                });
            }
            assert.equal(
                (await db`SELECT balance FROM steam_users WHERE id = 'steam'`)[0].balance,
                90,
            );
            assert.equal(
                (await db`SELECT COUNT(*)::int AS count FROM public_event_orders`)[0].count,
                1,
            );
            assert.equal(await purchase("1", "buyer", requestId), orderId);
            assert.equal(bots.fetchMock.mock.calls.length, calls);
            await assert.rejects(purchase());
            delete process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"];
            await assert.rejects(purchase());
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"] = "https://synthetic-bots.invalid";
            assert.equal(
                (await db`SELECT balance FROM steam_users WHERE id = 'steam'`)[0].balance,
                90,
            );
            assert.deepEqual(await db`SELECT * FROM public_event_orders`, before);
        },
    );

    await runCase(
        "ordinary member category spoof and datasource failures never debit or insert",
        async () => {
            await db`UPDATE public_event_catalog SET category = 'modifier', command = '/TRAITOR' WHERE id = ${eventId}`;
            assert.equal((await getPublicCatalog())[0]?.requiresDonor, true);
            assert.equal((await getAdminCatalog())[0]?.requiresDonor, true);
            bots.fetchMock.mockImplementation(async () =>
                Response.json([{ role: "member", other_roles: ["unknown", "EditEconomyRewards"] }]),
            );
            await assert.rejects(purchase(), ForbiddenError);
            bots.fetchMock.mockImplementation(
                async () => new Response("synthetic outage", { status: 503 }),
            );
            await assert.rejects(purchase(), ServiceUnavailableError);
            bots.fetchMock.mockImplementation(async () =>
                Response.json([{ role: "donator", other_roles: "bad-json" }]),
            );
            await assert.rejects(purchase(), ServiceUnavailableError);
            delete process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"];
            await assert.rejects(purchase(), ServiceUnavailableError);
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"] = "https://synthetic-bots.invalid";
            assert.deepEqual(
                (await db`SELECT balance, lifetime_purchase_count FROM steam_users`)[0],
                { balance: 100, lifetime_purchase_count: 0 },
            );
            assert.equal(
                (await db`SELECT COUNT(*)::int AS count FROM public_event_orders`)[0].count,
                0,
            );
        },
    );

    await runCase(
        "Bots staff primary/secondary access, aliases, and retry after staff removal",
        async () => {
            bots.fetchMock.mockImplementation(async () =>
                Response.json([{ role: " TMODERATOR ", other_roles: [] }]),
            );
            const requestId = crypto.randomUUID();
            const orderId = await purchase("1", "buyer", requestId);
            bots.fetchMock.mockImplementation(async () =>
                Response.json([{ role: "member", other_roles: [" MANAGEMENT "] }]),
            );
            await purchase();
            bots.fetchMock.mockImplementation(async () =>
                Response.json([{ role: "member", other_roles: '[" DISCORD-STAFF "]' }]),
            );
            await purchase();
            bots.fetchMock.mockImplementation(async () =>
                Response.json([{ role: "member", other_roles: [] }]),
            );
            const calls = bots.fetchMock.mock.calls.length;
            assert.equal(await purchase("1", "buyer", requestId), orderId);
            assert.equal(bots.fetchMock.mock.calls.length, calls);
            await assert.rejects(purchase(), ForbiddenError);
            bots.fetchMock.mockImplementation(async () =>
                Response.json([{ role: "helper", other_roles: "bad-json" }]),
            );
            await assert.rejects(purchase(), ServiceUnavailableError);
            delete process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"];
            assert.equal(await purchase("1", "buyer", requestId), orderId);
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"] = "https://synthetic-bots.invalid";
            assert.deepEqual(
                (await db`SELECT balance, lifetime_purchase_count FROM steam_users`)[0],
                { balance: 70, lifetime_purchase_count: 3 },
            );
            assert.equal(
                (await db`SELECT COUNT(*)::int AS count FROM public_event_orders`)[0].count,
                3,
            );
            assert.equal((await getPublicCatalog())[0]?.requiresDonor, true);
        },
    );

    await runCase(
        "secondary donor purchase and paid retry survive donor removal and outage",
        async () => {
            bots.fetchMock.mockImplementation(async () =>
                Response.json([{ role: "member", other_roles: '[" D2SILVER "]' }]),
            );
            const requestId = crypto.randomUUID();
            const orderId = await purchase("1", "buyer", requestId);
            bots.fetchMock.mockImplementation(async () =>
                Response.json([{ role: "member", other_roles: [] }]),
            );
            const calls = bots.fetchMock.mock.calls.length;
            assert.equal(await purchase("1", "buyer", requestId), orderId);
            assert.equal(bots.fetchMock.mock.calls.length, calls);
            await assert.rejects(purchase(), ForbiddenError);
            delete process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"];
            assert.equal(await purchase("1", "buyer", requestId), orderId);
            await assert.rejects(purchase("2", "buyer", requestId), ForbiddenError);
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"] = "https://synthetic-bots.invalid";
            assert.deepEqual(
                (await db`SELECT balance, lifetime_purchase_count FROM steam_users`)[0],
                { balance: 90, lifetime_purchase_count: 1 },
            );
            assert.equal(
                (await db`SELECT COUNT(*)::int AS count FROM public_event_orders`)[0].count,
                1,
            );
        },
    );

    await runCase(
        "concurrent distinct purchases cannot overspend a shared Steam balance",
        async () => {
            const results = await Promise.allSettled(
                Array.from({ length: 16 }, (_, i) =>
                    purchase(i % 2 ? "1" : "2", i % 3 ? "buyer" : "alias"),
                ),
            );
            assert.equal(results.filter((r) => r.status === "fulfilled").length, 10);
            assert.equal(results.filter((r) => r.status === "rejected").length, 6);
            for (const result of results) {
                if (result.status === "rejected") {
                    assert(result.reason instanceof Error);
                    assert.equal(result.reason.message, "You cannot afford this event.");
                }
            }
            assert.deepEqual(
                (await db`SELECT balance, lifetime_purchase_count FROM steam_users`)[0],
                { balance: 0, lifetime_purchase_count: 10 },
            );
            assert.equal(
                (await db`SELECT COUNT(*)::int AS count FROM public_event_orders`)[0].count,
                10,
            );
        },
    );

    await runCase(
        "FIFO reservations, duplicate authorization/results, and three completed intervening rounds",
        async () => {
            const first = await purchase();
            await db`UPDATE public_event_catalog SET command = 'tiny' WHERE id = ${eventId}`;
            const second = await purchase();
            const roundId = crypto.randomUUID();
            const decisions = await Promise.all(
                Array.from({ length: 8 }, () => reportRound("1", 1, instance, roundId, "prepare")),
            );
            const reservation = decisions[0]?.reservation;
            assert(reservation);
            assert.equal(reservation.orderId, first);
            assert.equal(new Set(decisions.map((d) => d.reservation?.deliveryId)).size, 1);
            await assert.rejects(
                recordResult(
                    "1",
                    1,
                    instance,
                    first,
                    roundId,
                    reservation.deliveryId,
                    "started",
                    "Never authorized",
                ),
            );
            await assert.rejects(
                authorizeStart("1", 1, instance, first, roundId, reservation.deliveryId),
            );
            await assert.rejects(heartbeatServer("1", 2, instance));
            await assert.rejects(heartbeatServer("1", 1, crypto.randomUUID()));
            await reportRound("1", 1, instance, roundId, "started");
            await Promise.all(
                Array.from({ length: 4 }, () =>
                    authorizeStart("1", 1, instance, first, roundId, reservation.deliveryId),
                ),
            );
            await recordResult(
                "1",
                1,
                instance,
                first,
                roundId,
                reservation.deliveryId,
                "deferred",
                "Definitely did not run",
            );
            assert.equal(
                (await reportRound("1", 1, instance, roundId, "started")).reservation,
                null,
            );
            await reportRound("1", 1, instance, roundId, "ended");
            const paidRound = crypto.randomUUID();
            const retry = (await reportRound("1", 1, instance, paidRound, "started")).reservation;
            assert(retry);
            assert.equal(retry.orderId, first);
            await recordResult(
                "1",
                1,
                instance,
                first,
                roundId,
                reservation.deliveryId,
                "deferred",
                "Stale retry",
            );
            assert.equal((await getPublicQueue(query)).items[0]?.status, "reserved");
            await authorizeStart("1", 1, instance, first, paidRound, retry.deliveryId);
            await Promise.all(
                Array.from({ length: 4 }, () =>
                    recordResult(
                        "1",
                        1,
                        instance,
                        first,
                        paidRound,
                        retry.deliveryId,
                        "started",
                        "Executed",
                    ),
                ),
            );
            await recordResult(
                "1",
                1,
                instance,
                first,
                paidRound,
                retry.deliveryId,
                "uncertain",
                "Late downgrade",
            );
            assert.equal((await getAdminOrders(query)).items[0]?.status, "fulfilled");
            assert.equal((await reportRound("1", 1, instance, paidRound, "ended")).gapRemaining, 3);

            const prepareOnly = crypto.randomUUID();
            assert.equal(
                (await reportRound("1", 1, instance, prepareOnly, "prepare")).reservation,
                null,
            );
            assert.equal(
                (await reportRound("1", 1, instance, prepareOnly, "ended")).gapRemaining,
                3,
            );
            const abandoned = crypto.randomUUID();
            await reportRound("1", 1, instance, abandoned, "started");
            const gapRound1 = crypto.randomUUID();
            assert.equal(
                (await reportRound("1", 1, instance, gapRound1, "started")).reservation,
                null,
            );
            assert.equal(
                (await reportRound("1", 1, instance, abandoned, "prepare")).reservation,
                null,
            );
            assert.equal((await reportRound("1", 1, instance, gapRound1, "ended")).gapRemaining, 2);
            const gapRound2 = crypto.randomUUID();
            assert.equal(
                (await reportRound("1", 1, instance, gapRound2, "started")).reservation,
                null,
            );
            assert.equal((await reportRound("1", 1, instance, gapRound2, "ended")).gapRemaining, 1);
            const gapRound3 = crypto.randomUUID();
            assert.equal(
                (await reportRound("1", 1, instance, gapRound3, "started")).reservation,
                null,
            );
            assert.equal((await reportRound("1", 1, instance, gapRound3, "ended")).gapRemaining, 0);
            assert.equal(
                (await reportRound("1", 1, instance, crypto.randomUUID(), "started")).reservation
                    ?.orderId,
                second,
            );
        },
    );

    await runCase(
        "repeated events wait, yield to modifiers, and never bypass uncertainty",
        async () => {
            const execute = async (orderId: number): Promise<void> => {
                const roundId = crypto.randomUUID();
                const reservation = (await reportRound("1", 1, instance, roundId, "started"))
                    .reservation;
                assert.equal(reservation?.orderId, orderId);
                assert(reservation);
                await authorizeStart("1", 1, instance, orderId, roundId, reservation.deliveryId);
                await recordResult(
                    "1",
                    1,
                    instance,
                    orderId,
                    roundId,
                    reservation.deliveryId,
                    "started",
                    "Executed",
                );
                await reportRound("1", 1, instance, roundId, "ended");
            };
            const finishGap = async (): Promise<void> => {
                for (let i = 0; i < 3; i++) {
                    const roundId = crypto.randomUUID();
                    // eslint-disable-next-line no-await-in-loop
                    const decision = await reportRound("1", 1, instance, roundId, "started");
                    assert.equal(decision.reservation, null);
                    // eslint-disable-next-line no-await-in-loop
                    await reportRound("1", 1, instance, roundId, "ended");
                }
            };
            const first = await purchase();
            await execute(first);
            const repeat = await purchase();
            const anotherRepeat = await purchase();
            let queue = (await getPublicQueue({ ...query, serverId: "1" })).items;
            assert.deepEqual(
                queue.map((o) => o.repeatDeferral),
                ["waiting", "waiting"],
            );
            const otherServer = await purchase("2");
            assert.equal(
                (await reportRound("2", 2, instance, crypto.randomUUID(), "started")).reservation
                    ?.orderId,
                otherServer,
            );
            await finishGap();
            const waitingRound = crypto.randomUUID();
            assert.equal(
                (await reportRound("1", 1, instance, waitingRound, "started")).reservation,
                null,
            );
            await reportRound("1", 1, instance, waitingRound, "ended");
            await db`UPDATE public_event_catalog SET command = 'tiny' WHERE id = ${eventId}`;
            const different = await purchase();
            queue = (await getPublicQueue({ ...query, serverId: "1" })).items;
            assert.deepEqual(
                queue.map((o) => o.id),
                [different, repeat, anotherRepeat],
            );
            assert.deepEqual(
                queue.map((o) => o.position),
                [1, 2, 3],
            );
            assert.deepEqual(
                queue.map((o) => o.repeatDeferral),
                ["none", "moved", "waiting"],
            );
            const roundId = crypto.randomUUID();
            const reservations = await Promise.all(
                Array.from({ length: 8 }, () => reportRound("1", 1, instance, roundId, "started")),
            );
            assert(reservations.every((r) => r.reservation?.orderId === different));
            const delivery = reservations[0]?.reservation;
            assert(delivery);
            // Start authorization rechecks the repeat rule, even for an existing reservation.
            await db`UPDATE public_event_orders SET command = 'traitor' WHERE id = ${different}`;
            await assert.rejects(
                authorizeStart("1", 1, instance, different, roundId, delivery.deliveryId),
                ForbiddenError,
            );
            await db`UPDATE public_event_orders SET command = 'tiny' WHERE id = ${different}`;
            await authorizeStart("1", 1, instance, different, roundId, delivery.deliveryId);
            await recordResult(
                "1",
                1,
                instance,
                different,
                roundId,
                delivery.deliveryId,
                "deferred",
                "No gameplay",
            );
            await reportRound("1", 1, instance, roundId, "ended");
            assert.equal(
                (await getPublicQueue({ ...query, serverId: "1" })).items[0]?.id,
                different,
            );
            await execute(different);
            await finishGap();
            const confirmedRound = crypto.randomUUID();
            const reserved = (await reportRound("1", 1, instance, confirmedRound, "started"))
                .reservation;
            assert.equal(reserved?.orderId, repeat);
            assert.equal(
                (await getPublicQueue({ ...query, serverId: "1" })).items[0]?.repeatDeferral,
                "none",
            );
            await reconcileOrder(repeat, "staff", "started", "Verified execution");
            await reportRound("1", 1, instance, confirmedRound, "ended");
            assert.equal(
                (await getPublicQueue({ ...query, serverId: "1" })).items[0]?.repeatDeferral,
                "waiting",
            );
            await db`UPDATE public_event_catalog SET command = 'traitor' WHERE id = ${eventId}`;
            const barrier = await purchase();
            await db`UPDATE public_event_orders SET status = 'uncertain' WHERE id = ${barrier}`;
            await db`UPDATE public_event_catalog SET command = 'tiny' WHERE id = ${eventId}`;
            const behindBarrier = await purchase();
            queue = (await getPublicQueue({ ...query, serverId: "1" })).items;
            assert.deepEqual(
                queue.map((o) => o.id),
                [anotherRepeat, barrier, behindBarrier],
            );
            await finishGap();
            assert.equal(
                (await reportRound("1", 1, instance, crypto.randomUUID(), "started")).reservation,
                null,
            );
            assert.equal(
                (await getAdminOrders(query)).items.find((o) => o.id === anotherRepeat)
                    ?.repeatDeferral,
                "waiting",
            );
        },
    );

    await runCase(
        "song variants and renamed catalog entries still count as the same event",
        async () => {
            await db`UPDATE public_event_catalog SET command = 'hangthedj 1' WHERE id = ${eventId}`;
            const first = await purchase();
            const roundId = crypto.randomUUID();
            const reservation = (await reportRound("1", 1, instance, roundId, "started"))
                .reservation;
            assert(reservation);
            await authorizeStart("1", 1, instance, first, roundId, reservation.deliveryId);
            await recordResult(
                "1",
                1,
                instance,
                first,
                roundId,
                reservation.deliveryId,
                "started",
                "Song one",
            );
            await reportRound("1", 1, instance, roundId, "ended");
            const variant = await createCatalogItem({
                name: "Different Name",
                category: "modifier",
                command: "hangthedj 11",
                cost: 10,
                enabled: true,
                description: "",
                image: null,
            });
            const repeat = (
                await purchasePublicEvent({
                    buyerId: "buyer",
                    eventId: variant.id,
                    serverId: "1",
                    expectedPrice: 10,
                    requestId: crypto.randomUUID(),
                })
            ).orderId;
            assert.equal(
                (await getPublicQueue(query)).items.find((o) => o.id === repeat)?.repeatDeferral,
                "waiting",
            );
            await db`UPDATE public_event_catalog SET command = 'gravity' WHERE id = ${eventId}`;
            const modifier = await purchase();
            assert.deepEqual(
                (await getPublicQueue(query)).items.map((o) => o.id),
                [modifier, repeat],
            );
            assert.equal(
                (await getPublicQueue(query)).items.find((o) => o.id === repeat)?.repeatDeferral,
                "moved",
            );
            await createPublicEventsTables();
            assert.deepEqual(
                (await getPublicQueue(query)).items.map((o) => o.id),
                [modifier, repeat],
            );
        },
    );

    await runCase(
        "reserved head stays fixed while new repeat purchases move back immediately",
        async () => {
            await db`UPDATE public_event_catalog SET command = 'gravity' WHERE id = ${eventId}`;
            const fixed = await purchase();
            const roundId = crypto.randomUUID();
            const reservation = (await reportRound("1", 1, instance, roundId, "prepare"))
                .reservation;
            assert.equal(reservation?.orderId, fixed);
            await db`UPDATE public_event_catalog SET command = 'tiny' WHERE id = ${eventId}`;
            const tiny1 = await purchase();
            const tiny2 = await purchase();
            await db`UPDATE public_event_catalog SET command = 'traitor' WHERE id = ${eventId}`;
            const separator = await purchase();
            const queue = (await getPublicQueue(query)).items;
            assert.deepEqual(
                queue.map((order) => order.id),
                [fixed, tiny1, separator, tiny2],
            );
            assert.deepEqual(
                queue.map((order) => order.position),
                [1, 2, 3, 4],
            );
            assert.equal(queue[0]?.status, "reserved");
            assert.equal(queue[3]?.repeatDeferral, "moved");
            assert.equal(
                (await reportRound("1", 1, instance, roundId, "prepare")).reservation?.deliveryId,
                reservation?.deliveryId,
            );
        },
    );

    await runCase(
        "full queue positions separate every repeat and persist across restart",
        async () => {
            await db`UPDATE public_event_catalog SET command = 'tiny' WHERE id = ${eventId}`;
            const first = await purchase();
            const roundId = crypto.randomUUID();
            const reservation = (await reportRound("1", 1, instance, roundId, "started"))
                .reservation;
            assert(reservation);
            await authorizeStart("1", 1, instance, first, roundId, reservation.deliveryId);
            await recordResult(
                "1",
                1,
                instance,
                first,
                roundId,
                reservation.deliveryId,
                "started",
                "Tiny ran",
            );
            await reportRound("1", 1, instance, roundId, "ended");
            const repeat1 = await purchase();
            const repeat2 = await purchase();
            await db`UPDATE public_event_catalog SET command = 'gravity' WHERE id = ${eventId}`;
            const different1 = await purchase();
            await db`UPDATE public_event_catalog SET command = 'traitor' WHERE id = ${eventId}`;
            const different2 = await purchase();
            const queue = (await getPublicQueue(query)).items;
            assert.deepEqual(
                queue.map((order) => order.id),
                [different1, repeat1, different2, repeat2],
            );
            assert.deepEqual(
                queue.map((order) => order.position),
                [1, 2, 3, 4],
            );
            assert.deepEqual(
                queue.map((order) => order.repeatDeferral),
                ["none", "moved", "none", "moved"],
            );
            const history = (await getAdminOrders(query)).items;
            for (const order of queue)
                assert.equal(
                    history.find((item) => item.id === order.id)?.position,
                    order.position,
                );
            await createPublicEventsTables();
            assert.deepEqual((await getPublicQueue(query)).items, queue);
            const stored = await db<{ id: number; queue_order: number | string }[]>`
            SELECT id, queue_order FROM public_event_orders WHERE status <> 'fulfilled' ORDER BY queue_order`;
            assert.deepEqual(
                stored.map((order) => order.id),
                queue.map((order) => order.id),
            );
            assert.deepEqual(
                stored.map((order) => Number(order.queue_order)),
                [1, 2, 3, 4],
            );
            await db`UPDATE public_event_catalog SET command = 'tiny' WHERE id = ${eventId}`;
            const repeat3 = await purchase();
            assert.equal((await getPublicQueue(query)).items.at(-1)?.repeatDeferral, "waiting");
            await db`UPDATE public_event_catalog SET command = 'gravity' WHERE id = ${eventId}`;
            const different3 = await purchase();
            assert.deepEqual(
                (await getPublicQueue(query)).items.map((order) => order.id),
                [different1, repeat1, different2, repeat2, different3, repeat3],
            );
            assert.equal((await getPublicQueue(query)).items.at(-1)?.repeatDeferral, "moved");
            assert.equal((await getPublicServers())[0]?.gapRemaining, 3);
        },
    );

    await runCase(
        "repeat modifiers wait across restart and unlock only after a different start",
        async () => {
            await db`UPDATE public_event_catalog SET command = 'tiny' WHERE id = ${eventId}`;
            const first = await purchase();
            const roundId = crypto.randomUUID();
            const reservation = (await reportRound("1", 1, instance, roundId, "started"))
                .reservation;
            assert(reservation);
            await authorizeStart("1", 1, instance, first, roundId, reservation.deliveryId);
            await recordResult(
                "1",
                1,
                instance,
                first,
                roundId,
                reservation.deliveryId,
                "started",
                "Tiny started",
            );
            await reportRound("1", 1, instance, roundId, "ended");
            const repeat = await purchase();
            assert.equal((await getPublicQueue(query)).items[0]?.repeatDeferral, "waiting");
            await createPublicEventsTables();
            const replacement = crypto.randomUUID();
            await db`UPDATE public_event_servers SET instance_until = NOW() - INTERVAL '1 second' WHERE id = '1'`;
            await heartbeatServer("1", 1, replacement);
            for (let i = 0; i < 3; i++) {
                const gapRound = crypto.randomUUID();
                // eslint-disable-next-line no-await-in-loop
                const decision = await reportRound("1", 1, replacement, gapRound, "started");
                assert.equal(decision.reservation, null);
                // eslint-disable-next-line no-await-in-loop
                await reportRound("1", 1, replacement, gapRound, "ended");
            }
            const waitingRound = crypto.randomUUID();
            assert.equal(
                (await reportRound("1", 1, replacement, waitingRound, "started")).reservation,
                null,
            );
            await reportRound("1", 1, replacement, waitingRound, "ended");
            await db`UPDATE public_event_catalog SET command = 'gravity' WHERE id = ${eventId}`;
            const different = await purchase();
            assert.deepEqual(
                (await getPublicQueue(query)).items.map((o) => o.id),
                [different, repeat],
            );
            const newRound = crypto.randomUUID();
            const selected = (await reportRound("1", 1, replacement, newRound, "started"))
                .reservation;
            assert(selected);
            assert.equal(selected.orderId, different);
            await authorizeStart("1", 1, replacement, different, newRound, selected.deliveryId);
            await recordResult(
                "1",
                1,
                replacement,
                different,
                newRound,
                selected.deliveryId,
                "uncertain",
                "Unknown",
            );
            assert.equal((await getPublicQueue(query)).items[0]?.status, "uncertain");
            await reconcileOrder(different, "staff", "retry", "Confirmed it did not start");
            assert.deepEqual(
                (await getPublicQueue(query)).items.map((o) => o.id),
                [different, repeat],
            );
            assert.equal((await getPublicQueue(query)).items[1]?.repeatDeferral, "moved");
        },
    );

    await runCase(
        "uncertain quarantine, staff recovery/audit, and stale expired-delivery cleanup",
        async () => {
            const first = await purchase();
            await purchase();
            const roundId = crypto.randomUUID();
            const reservation = (await reportRound("1", 1, instance, roundId, "started"))
                .reservation;
            assert(reservation);
            await authorizeStart("1", 1, instance, first, roundId, reservation.deliveryId);
            await db`UPDATE public_event_deliveries SET lease_until = NOW() - INTERVAL '1 second' WHERE id = ${reservation.deliveryId}`;
            await heartbeatServer("1", 1, instance);
            assert.equal((await getPublicQueue(query)).items[0]?.status, "uncertain");
            await assert.rejects(
                authorizeStart("1", 1, instance, first, roundId, reservation.deliveryId),
            );
            await recordResult(
                "1",
                1,
                instance,
                first,
                roundId,
                reservation.deliveryId,
                "deferred",
                "Cannot downgrade quarantine",
            );
            await reportRound("1", 1, instance, roundId, "ended");
            const nextRound = crypto.randomUUID();
            assert.equal(
                (await reportRound("1", 1, instance, nextRound, "started")).reservation,
                null,
            );
            await assert.rejects(reconcileOrder(first, "staff", "retry", "   "));
            await reconcileOrder(first, "staff", "retry", "Verified not executed");
            const retry = (await reportRound("1", 1, instance, nextRound, "started")).reservation;
            assert.equal(retry?.orderId, first);
            await heartbeatServer("1", 1, instance);
            assert.equal((await getPublicQueue(query)).items[0]?.status, "reserved");
            const history = await getAdminOrders(query);
            assert.equal(history.items[0]?.audits[0]?.reason, "Verified not executed");
            assert.equal(history.items[0]?.delivery?.id, retry?.deliveryId);
            await reconcileOrder(first, "staff", "started", "Confirmed by staff");
            assert.equal((await getAdminOrders(query)).items[0]?.status, "fulfilled");
        },
    );

    await runCase(
        "original-instance journal result after takeover and server disabling",
        async () => {
            const orderId = await purchase();
            const roundId = crypto.randomUUID();
            const reservation = (await reportRound("1", 1, instance, roundId, "started"))
                .reservation;
            assert(reservation);
            await authorizeStart("1", 1, instance, orderId, roundId, reservation.deliveryId);
            const replacement = crypto.randomUUID();
            await db`UPDATE public_event_servers SET instance_until = NOW() - INTERVAL '1 second' WHERE id = '1'`;
            await heartbeatServer("1", 1, replacement);
            await assert.rejects(
                authorizeStart("1", 1, replacement, orderId, roundId, reservation.deliveryId),
            );
            await assert.rejects(
                recordResult(
                    "1",
                    1,
                    replacement,
                    orderId,
                    roundId,
                    reservation.deliveryId,
                    "started",
                    "Wrong journal instance",
                ),
            );
            await recordResult(
                "1",
                1,
                instance,
                orderId,
                roundId,
                reservation.deliveryId,
                "started",
                "Original journal",
            );
            assert.equal(
                (await db`SELECT instance_id FROM public_event_servers WHERE id = '1'`)[0]
                    .instance_id,
                replacement,
            );
            await updateAdminServer("1", { enabled: false, pluginTokenId: 1 });
            await recordResult(
                "1",
                1,
                instance,
                orderId,
                roundId,
                reservation.deliveryId,
                "started",
                "Duplicate after disabling",
            );
            assert.equal((await getAdminOrders(query)).items[0]?.status, "fulfilled");
        },
    );

    await runCase(
        "public/admin queries, pagination, catalog snapshots, and token binding",
        async () => {
            const first = await purchase();
            await purchase("2");
            await updateCatalogItem(eventId, {
                category: "survival",
                name: "Changed",
                description: "Changed",
                image: null,
                cost: 20,
                command: "hle",
                enabled: true,
            });
            assert.equal((await getPublicCatalog())[0]?.name, "Changed");
            assert.equal((await getAdminCatalog())[0]?.command, "hle");
            const publicQueue = await getPublicQueue(query);
            assert.equal(publicQueue.totalItemCount, 2);
            assert.deepEqual(
                publicQueue.items.map((o) => o.position),
                [1, 1],
            );
            assert.equal(publicQueue.items[0]?.eventName, "Synthetic Event");
            assert(!JSON.stringify(publicQueue).includes('"command"'));
            assert(!JSON.stringify(publicQueue).includes('"buyerId"'));
            assert.equal((await getPublicQueue({ ...query, serverId: "1" })).totalItemCount, 1);
            assert.deepEqual(await getPublicQueue({ ...query, page: 99, serverId: "1" }), {
                items: [],
                totalItemCount: 1,
            });
            assert.equal((await getAdminOrders({ ...query, page: 99 })).totalItemCount, 2);
            assert.equal((await getAdminOrders({ ...query, serverId: "1" })).items[0]?.id, first);
            assert.equal((await getAdminOrders(query)).items[0]?.command, "traitor");
            assert.equal((await getPublicServers()).length, 2);
            assert.equal((await getAdminServers())[0]?.pluginTokenId, 1);
            await updateAdminServer("2", { enabled: true, pluginTokenId: 1 });
            await assert.rejects(updateAdminServer("1", { enabled: true, pluginTokenId: 999 }));
            await heartbeatServer("1", 1, instance);
            await updateAdminServer("1", { enabled: true, pluginTokenId: 3 });
            assert.equal(
                (await db`SELECT instance_id FROM public_event_servers WHERE id = '1'`)[0]
                    .instance_id,
                null,
            );
            await assert.rejects(heartbeatServer("1", 1, instance));
            await heartbeatServer("1", 3, instance);
        },
    );

    if (process.env["PAID_EVENTS_PLUGIN_INTEGRATION"] === "1") {
        for (const mode of ["event", "modifier", "false", "inactive", "empty"]) {
            // Each child uses the real plugin scheduler/client/journal against actual HTTP route handlers and PostgreSQL.
            // eslint-disable-next-line no-await-in-loop
            await runCase(`real API/plugin HTTP delivery (${mode})`, () =>
                runPluginHttpFixture(db, eventId, mode),
            );
        }
    }
    console.log(`Paid-events PostgreSQL integration: ${passed} checks passed.`);
} finally {
    bots.restore();
    await db.close({ timeout: 5 });
}
