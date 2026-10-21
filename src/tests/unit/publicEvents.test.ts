import { expect, test } from "bun:test";
import type { SQL } from "bun";
import assert from "node:assert/strict";
import { setPostgres } from "@/global/pg";
import {
    authorizeStart,
    heartbeatServer,
    recordResult,
    reportRound,
    purchasePublicEvent,
    cancelOrder,
} from "@/services/publicEvents";

// A query double exercises service guards without connecting to any database.
// It does not validate PostgreSQL syntax, constraints, or concurrent locking.
test("paid event service regression guards", async () => {
    const instance = "11111111-1111-4111-8111-111111111111";
    const replacement = "22222222-2222-4222-8222-222222222222";
    const roundId = "33333333-3333-4333-8333-333333333333";
    const deliveryId = "44444444-4444-4444-8444-444444444444";
    const server = {
        id: "1",
        enabled: true,
        plugin_token_id: 7,
        instance_id: instance,
        instance_until: new Date(Date.now() + 30000),
        current_round: roundId,
        round_number: 1,
        last_paid_round_number: null,
    };
    const round = {
        id: roundId,
        server_id: "1",
        instance_id: instance,
        number: 1,
        phase: "started",
        started_at: new Date(),
        ended_at: null,
        attempted: false,
        paid: false,
    };
    const delivery = {
        id: deliveryId,
        order_id: 9,
        round_id: roundId,
        instance_id: instance,
        status: "reserved",
        lease_until: new Date(Date.now() + 60000),
        authorized_at: null,
        outcome: null,
    };
    const order = {
        id: 9,
        server_id: "1",
        status: "reserved",
        delivery_id: deliveryId,
        command: "traitor",
    };
    let queries: { text: string; values: unknown[] }[] = [];
    const install = (
        override: (text: string, values: unknown[]) => unknown[] | undefined = (): undefined =>
            undefined,
    ): void => {
        queries = [];
        const tx = async (
            strings: TemplateStringsArray,
            ...values: unknown[]
        ): Promise<unknown[]> => {
            const text = strings.join("?").replace(/\s+/g, " ").trim();
            queries.push({ text, values });
            const custom = override(text, values);
            if (custom !== undefined) return custom;
            if (text.startsWith("SELECT * FROM public_event_servers")) return [server];
            if (text.startsWith("SELECT * FROM public_event_rounds")) return [round];
            if (text.startsWith("SELECT * FROM public_event_deliveries WHERE id"))
                return [delivery];
            if (text.startsWith("SELECT * FROM public_event_orders WHERE id")) return [order];
            if (text.startsWith("SELECT COUNT")) return [{ count: "0" }];
            return [];
        };
        setPostgres({
            begin: (work: (sql: typeof tx) => Promise<unknown>) => work(tx),
        } as unknown as SQL);
    };

    install();
    expect(await authorizeStart("1", 7, instance, 9, roundId, deliveryId)).toEqual({
        authorized: true,
    });
    expect(queries.some((q) => q.text.includes("SET attempted = TRUE"))).toBe(true);

    install((text) => {
        if (
            text.startsWith("SELECT * FROM public_event_orders") &&
            text.includes("ORDER BY COALESCE")
        )
            return [{ ...order, status: "queued", event_name: "Event", command: "traitor" }];
        if (text.startsWith("INSERT INTO public_event_deliveries")) return [delivery];
        if (text.startsWith("UPDATE public_event_orders") && text.includes("RETURNING"))
            return [order];
        return undefined;
    });
    await reportRound("1", 7, instance, roundId, "started");
    expect(
        queries.find((q) => q.text.startsWith("INSERT INTO public_event_deliveries"))?.values[3],
    ).toBe(instance);

    install((text) =>
        text.startsWith("SELECT * FROM public_event_orders") && text.includes("ORDER BY COALESCE")
            ? [{ ...order, status: "uncertain" }]
            : undefined,
    );
    await reportRound("1", 7, instance, roundId, "started");
    expect(queries.some((q) => q.text.startsWith("INSERT INTO public_event_deliveries"))).toBe(
        false,
    );

    for (const status of ["uncertain", "expired", "deferred", "started"]) {
        install((text) =>
            text.startsWith("SELECT * FROM public_event_deliveries WHERE id")
                ? [{ ...delivery, status }]
                : undefined,
        );
        // Each scenario installs a different shared query double.
        // eslint-disable-next-line no-await-in-loop
        await assert.rejects(authorizeStart("1", 7, instance, 9, roundId, deliveryId));
    }
    install((text) =>
        text.startsWith("SELECT * FROM public_event_deliveries WHERE id")
            ? [{ ...delivery, status: "starting", instance_id: replacement }]
            : undefined,
    );
    await assert.rejects(authorizeStart("1", 7, instance, 9, roundId, deliveryId));

    install((text) =>
        text.startsWith("SELECT * FROM public_event_rounds")
            ? [{ ...round, attempted: true }]
            : undefined,
    );
    await assert.rejects(authorizeStart("1", 7, instance, 9, roundId, deliveryId));

    install((text) =>
        text.startsWith("SELECT * FROM public_event_servers")
            ? [{ ...server, enabled: false, instance_id: replacement }]
            : text.startsWith("SELECT * FROM public_event_deliveries WHERE id")
              ? [{ ...delivery, status: "starting", authorized_at: new Date() }]
              : undefined,
    );
    expect(
        await recordResult("1", 7, instance, 9, roundId, deliveryId, "started", "journal replay"),
    ).toEqual({ ok: true });
    expect(queries.some((q) => q.text.includes("SET status = 'fulfilled'"))).toBe(true);
    expect(queries.some((q) => q.text.includes("SET instance_until"))).toBe(false);

    install();
    await assert.rejects(recordResult("1", 7, instance, 9, roundId, deliveryId, "started", ""));
    install((text) =>
        text.startsWith("SELECT * FROM public_event_deliveries WHERE id")
            ? [{ ...delivery, status: "uncertain", authorized_at: new Date() }]
            : undefined,
    );
    await recordResult("1", 7, instance, 9, roundId, deliveryId, "deferred", "late");
    expect(queries.some((q) => q.text.startsWith("UPDATE public_event_orders"))).toBe(false);

    install((text) =>
        text.startsWith("SELECT * FROM public_event_orders WHERE id")
            ? [{ ...order, delivery_id: "newer" }]
            : undefined,
    );
    await recordResult("1", 7, instance, 9, roundId, deliveryId, "deferred", "stale");
    expect(queries.some((q) => q.text.startsWith("UPDATE public_event_orders"))).toBe(false);

    install();
    await heartbeatServer("1", 7, instance);
    for (const q of queries.filter(
        (row) =>
            row.text.includes("FROM public_event_orders AS o") ||
            row.text.includes("FROM public_event_deliveries AS d"),
    )) {
        expect(q.text).toContain("o.delivery_id = d.id");
    }

    install((text) =>
        text.startsWith("SELECT * FROM public_event_servers")
            ? [{ ...server, current_round: "newer", round_number: 2 }]
            : undefined,
    );
    await reportRound("1", 7, instance, roundId, "prepare");
    expect(queries.some((q) => q.text.includes("SET phase = 'abandoned'"))).toBe(false);

    install((text) =>
        text.startsWith("SELECT * FROM public_event_rounds")
            ? [{ ...round, phase: "prepare", started_at: null }]
            : undefined,
    );
    await reportRound("1", 7, instance, roundId, "ended");
    expect(queries.some((q) => q.text.includes("CASE WHEN started_at IS NULL THEN NULL"))).toBe(
        true,
    );

    install((text) =>
        text.startsWith("SELECT * FROM public_event_orders WHERE buyer_id")
            ? [{ ...order, payload_hash: "different" }]
            : undefined,
    );
    await assert.rejects(
        purchasePublicEvent({
            buyerId: "buyer",
            eventId: 1,
            serverId: "1",
            expectedPrice: 10,
            requestId: instance,
        }),
    );
    expect(queries[0]?.text).toContain("pg_advisory_xact_lock");

    install((text) => {
        if (text.startsWith("SELECT server_id FROM public_event_orders"))
            return [{ server_id: "1" }];
        if (text.startsWith("SELECT * FROM public_event_orders WHERE id"))
            return [{ ...order, status: "queued" }];
        return undefined;
    });
    expect(await cancelOrder(9, "manager", "  Removed by request  ")).toEqual({ ok: true });
    const serverLock = queries.findIndex((q) =>
        q.text.startsWith("SELECT id FROM public_event_servers"),
    );
    const orderLock = queries.findIndex((q) =>
        q.text.startsWith("SELECT * FROM public_event_orders WHERE id"),
    );
    expect(serverLock).toBeLessThan(orderLock);
    expect(queries.some((q) => q.text.includes("authorized_at IS NOT NULL"))).toBe(false);
    expect(
        queries.find((q) => q.text.startsWith("INSERT INTO public_event_audit"))?.values,
    ).toEqual([9, deliveryId, "manager", "Removed by request"]);
    expect(queries.some((q) => q.text.includes("SET status = 'cancelled'"))).toBe(true);
    expect(queries.some((q) => q.text.includes("steam_users"))).toBe(false);
    expect(queries.find((q) => q.text.includes("ORDER BY COALESCE"))?.text).toContain(
        "status IN ('queued','reserved','starting','uncertain')",
    );

    for (const status of ["reserved", "starting", "uncertain", "fulfilled", "cancelled"]) {
        install((text) =>
            text.startsWith("SELECT * FROM public_event_orders WHERE id")
                ? [{ ...order, status }]
                : undefined,
        );
        // eslint-disable-next-line no-await-in-loop
        await assert.rejects(cancelOrder(9, "manager", "Reason"));
        expect(queries.some((q) => q.text.startsWith("UPDATE"))).toBe(false);
    }
    install((text) => {
        if (text.startsWith("SELECT * FROM public_event_orders WHERE id"))
            return [{ ...order, status: "queued", delivery_id: null }];
        if (text.startsWith("SELECT id FROM public_event_deliveries"))
            return [{ id: "historical-authorized" }];
        return undefined;
    });
    expect(await cancelOrder(9, "manager", "Reason")).toEqual({ ok: true });
    expect(queries.some((q) => q.text.startsWith("UPDATE"))).toBe(true);
    await assert.rejects(cancelOrder(9, "manager", "   "));
    await assert.rejects(cancelOrder(9, "manager", "x".repeat(2001)));
    install((text) =>
        text.startsWith("SELECT * FROM public_event_orders WHERE id") ? [] : undefined,
    );
    await assert.rejects(cancelOrder(9, "manager", "Reason"));

    for (const outcome of ["started", "deferred", "uncertain"] as const) {
        install((text) => {
            if (text.startsWith("SELECT * FROM public_event_orders WHERE id"))
                return [{ ...order, status: "cancelled" }];
            if (text.startsWith("SELECT * FROM public_event_deliveries WHERE id"))
                return [{ ...delivery, authorized_at: new Date() }];
            return undefined;
        });
        // eslint-disable-next-line no-await-in-loop
        await recordResult("1", 7, instance, 9, roundId, deliveryId, outcome, "late");
        expect(queries.some((q) => q.text.startsWith("UPDATE"))).toBe(false);
    }

    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify({ eventId: 1, serverId: "1", expectedPrice: 10 })),
    );
    const payloadHash = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    install((text) => {
        if (text.startsWith("SELECT * FROM public_event_orders WHERE buyer_id"))
            return [
                { ...order, status: "cancelled", payload_hash: payloadHash, steam_id: "steam" },
            ];
        if (text.startsWith("SELECT balance")) return [{ balance: "90" }];
        return undefined;
    });
    expect(
        await purchasePublicEvent({
            buyerId: "buyer",
            eventId: 1,
            serverId: "1",
            expectedPrice: 10,
            requestId: instance,
        }),
    ).toEqual({ orderId: 9, balance: 90, pendingCount: 0 });
    expect(queries.some((q) => /^(INSERT|UPDATE|DELETE)/.test(q.text))).toBe(false);
    expect(queries.find((q) => q.text.startsWith("SELECT COUNT"))?.text).toContain(
        "status IN ('queued','reserved','starting','uncertain')",
    );
});
