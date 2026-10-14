import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import type { SQL } from "bun";
import { SiteError } from "@/errors/SiteError";
import { verifyPluginToken } from "@/routeUtils/verifyPluginToken";
import { postPublicEventHeartbeat } from "@/routes/public-events/servers/id/postPublicEventHeartbeat";
import { postPublicEventRound } from "@/routes/public-events/servers/id/postPublicEventRound";
import { postPublicEventStart } from "@/routes/public-events/servers/id/orders/id/postPublicEventStart";
import { postPublicEventResult } from "@/routes/public-events/servers/id/orders/id/postPublicEventResult";
import { EVENT_SERVER_ID, EVENT_ORDER_ID } from "@/shared/types/PublicEvents";
import type { AnyRequest } from "@/types/Express/AnyRequest";
import type { ServerTimer } from "@/utils/serverTimer";
import { getPublicQueue, purchasePublicEvent } from "@/services/publicEvents";
import type { Response as ExpressResponse } from "express";

/** Called only after the disposable runner verifies its database's actual storage. */
export async function runPluginHttpFixture(db: SQL, eventId: number, mode: string): Promise<void> {
    const command = mode === "modifier" ? "tiny" : "lasertag";
    const token = process.env["PANTHEON_PLUGIN_TOKEN"] ?? "offline-test-only";
    await db`UPDATE public_event_catalog SET command = ${command} WHERE id = ${eventId}`;
    await db.unsafe(`ALTER TABLE plugin_tokens ADD COLUMN IF NOT EXISTS token TEXT;
        ALTER TABLE plugin_tokens ADD COLUMN IF NOT EXISTS times_used INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE plugin_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;`);
    await db`UPDATE plugin_tokens SET token = ${token} WHERE id = 1`;
    const paid = await purchasePublicEvent({
        buyerId: "buyer",
        eventId,
        serverId: "1",
        expectedPrice: 10,
        requestId: crypto.randomUUID(),
    });
    assert.equal(paid.balance, 90);
    let resultRequests = 0;
    const timer = { create: () => ({ [Symbol.dispose](): void {} }) } as unknown as ServerTimer;
    const endpoints = {
        heartbeat: postPublicEventHeartbeat,
        round: postPublicEventRound,
        start: postPublicEventStart,
        result: postPublicEventResult,
    };
    const server = Bun.serve({
        hostname: "127.0.0.1",
        port: 0,
        async fetch(request): Promise<Response> {
            try {
                const path = new URL(request.url).pathname;
                const match =
                    /^\/public-events\/servers\/([12])\/(heartbeat|round|orders\/([1-9][0-9]*)\/(start|result))$/.exec(
                        path,
                    );
                if (request.method !== "POST" || !match) return new Response(null, { status: 404 });
                const name = (match[4] ?? match[2]) as keyof typeof endpoints;
                const endpoint = endpoints[name];
                const params = {
                    serverId: match[1],
                    ...(match[3] === undefined ? {} : { orderId: Number(match[3]) }),
                };
                EVENT_SERVER_ID.validate(params.serverId);
                if (params.orderId !== undefined) EVENT_ORDER_ID.validate(params.orderId);
                const body: unknown = await request.json();
                assert(endpoint.requestBody !== null && endpoint.responseBody !== null);
                endpoint.requestBody.validate(body);
                const req = {
                    body,
                    params,
                    get: (header: string) => request.headers.get(header) ?? undefined,
                } as unknown as AnyRequest;
                const plugin = await verifyPluginToken(req, timer);
                // DTOs, token verification, route handlers and service transactions are production code.
                const response = await endpoint.handleRequest({ req, plugin, timer } as never);
                endpoint.responseBody.validate(response);
                if (name === "result" && ++resultRequests === 1) {
                    // Commit fulfillment, but lose the acknowledgement: the plugin must retry reporting, not gameplay.
                    return Response.json(
                        { error: "Synthetic lost acknowledgement" },
                        { status: 500 },
                    );
                }
                return Response.json(response);
            } catch (error) {
                if (error instanceof SiteError) {
                    let status = 500;
                    let body: unknown;
                    error.makeResponse({
                        status(code: number) {
                            status = code;
                            return this;
                        },
                        json(value: unknown) {
                            body = value;
                            return this;
                        },
                    } as unknown as ExpressResponse);
                    return Response.json(body, { status });
                }
                return Response.json({ error: "Invalid integration request" }, { status: 400 });
            }
        },
    });
    const directory = await mkdtemp(
        "/var/folders/rk/sm2_j57s1m5c4lfkk36rqq7h0000gn/T/opencode/plugin-http-",
    );
    try {
        const root = `http://127.0.0.1:${server.port}/`;
        const invalidRequest = {
            get: () => "invalid-test-token",
        } as unknown as AnyRequest;
        await assert.rejects(() => verifyPluginToken(invalidRequest, timer));
        const child = Bun.spawn(
            [
                "dotnet",
                "run",
                "--no-restore",
                "--project",
                resolve(
                    import.meta.dir,
                    "../../../../PantheonEvents/Tests/PurchasedEvents.Tests.csproj",
                ),
                "-c",
                "Debug",
                "--",
                "--integration",
                root,
                directory + "/journal.json",
                mode,
            ],
            { stdout: "pipe", stderr: "pipe" },
        );
        const killed = setTimeout(() => child.kill(), 45000);
        try {
            const [stdout, stderr, exit] = await Promise.all([
                new Response(child.stdout).text(),
                new Response(child.stderr).text(),
                child.exited,
            ]);
            assert.equal(exit, 0, `Plugin HTTP fixture failed: ${stdout}\n${stderr}`);
            assert.match(stdout, /PASS real HTTP delivery/);
        } finally {
            clearTimeout(killed);
        }
        assert(resultRequests >= 2, "The lost result acknowledgement was not retried");
        const [order] = await db<
            { status: string; cost: number }[]
        >`SELECT status, cost FROM public_event_orders WHERE id = ${paid.orderId}`;
        const success = mode === "event" || mode === "modifier";
        assert.equal(
            order?.status,
            success ? "fulfilled" : mode === "empty" ? "queued" : "uncertain",
        );
        assert.equal(order?.cost, 10);
        assert.equal(
            (await getPublicQueue({ page: 0, perPage: 100, serverId: "1" })).totalItemCount,
            success ? 0 : 1,
        );
        const [steam] =
            await db`SELECT balance, lifetime_purchase_count FROM steam_users WHERE id = 'steam'`;
        assert.deepEqual(steam, { balance: 90, lifetime_purchase_count: 1 });
        const [round] =
            await db`SELECT phase, paid FROM public_event_rounds ORDER BY number DESC LIMIT 1`;
        assert.equal(round.phase, "ended");
        assert.equal(round.paid, success);
    } finally {
        await server.stop(true);
        await rm(directory, { recursive: true, force: true });
    }
}
