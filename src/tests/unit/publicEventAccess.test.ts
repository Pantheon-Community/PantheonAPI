import { expect, test } from "bun:test";
import assert from "node:assert/strict";
import type { SQL } from "bun";
import { ForbiddenError } from "@/errors/ForbiddenError";
import { ServiceUnavailableError } from "@/errors/ServiceUnavailableError";
import { setPostgres } from "@/global/pg";
import { eventRequiresDonor } from "@/services/publicEventCommands";
import { requireEventAccess } from "@/services/publicEventAccess";
import { purchasePublicEvent } from "@/services/publicEvents";
import { EVENT_CATALOG, EVENT_ADMIN_CATALOG, EVENT_PURCHASE } from "@/shared/types/PublicEvents";
import { mockBotsRoles } from "../fixtures/botsRoles";

test.serial(
    "authoritative donor/staff lookup and command-based purchase guards",
    async () => {
        const bots = mockBotsRoles();
        try {
            for (const role of ["donator", "d1bronze", "d2silver", "d3gold", "d4mega", "d5mega"]) {
                bots.fetchMock.mockImplementation(async () =>
                    Response.json([{ role: ` ${role.toUpperCase()} `, other_roles: [] }]),
                );
                // eslint-disable-next-line no-await-in-loop
                await requireEventAccess("verified-id");
            }
            for (const secondary of [["member", " D3GOLD "], '["member", " D5MEGA "]']) {
                bots.fetchMock.mockImplementation(async () =>
                    Response.json([{ role: "member", other_roles: secondary }]),
                );
                // eslint-disable-next-line no-await-in-loop
                await requireEventAccess("verified-id");
            }
            for (const role of [
                "helper",
                "tmoderator",
                "moderator",
                "smoderator",
                "admin",
                "scpslstaff",
                "discordstaff",
                "gamemaster",
                "supervisor",
                "developer",
                "manager",
                "director",
                "founder",
                "owner",
                "management",
                "discord-staff",
                "scpsl-staff",
            ]) {
                for (const row of [
                    { role: ` ${role.toUpperCase()} `, other_roles: [] },
                    { role: "member", other_roles: [` ${role.toUpperCase()} `] },
                    { role: "member", other_roles: JSON.stringify([` ${role.toUpperCase()} `]) },
                ]) {
                    bots.fetchMock.mockImplementation(async () => Response.json([row]));
                    // eslint-disable-next-line no-await-in-loop
                    await requireEventAccess("verified-id");
                }
            }
            const [url, options] = bots.fetchMock.mock.calls.at(-1)!;
            const parsed = new URL(url);
            expect(parsed.pathname).toBe("/rest/v1/roles");
            expect(parsed.searchParams.get("select")).toBe("role,other_roles");
            expect(parsed.searchParams.get("discord_id")).toBe("eq.verified-id");
            expect(parsed.searchParams.get("limit")).toBe("1");
            expect(options?.cache).toBe("no-store");
            expect(options?.signal).toBeInstanceOf(AbortSignal);
            expect(options?.headers).toMatchObject({
                apikey: "synthetic-service-key",
                "Accept-Profile": "public",
            });

            process.env["BOTS_SUPABASE_SERVICE_ROLE_KEY"] = "   ";
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"] =
                " synthetic-publishable-key ";
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"] = " https://synthetic-bots.invalid/ ";
            await requireEventAccess("verified-id");
            expect(bots.fetchMock.mock.calls.at(-1)?.[1]?.headers).toMatchObject({
                apikey: "synthetic-publishable-key",
                Authorization: "Bearer synthetic-publishable-key",
            });
            expect(new URL(bots.fetchMock.mock.calls.at(-1)![0]).pathname).toBe("/rest/v1/roles");
            process.env["BOTS_SUPABASE_SERVICE_ROLE_KEY"] = "synthetic-service-key";
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"] =
                "synthetic-publishable-key";
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"] = "https://synthetic-bots.invalid";

            for (const row of [
                [],
                [{ role: "member", other_roles: ["unknown", "staff", "EditEconomyRewards"] }],
                [{ role: "unknown", other_roles: ["member", "__proto__", "constructor"] }],
                [{ role: null, other_roles: null }],
            ]) {
                bots.fetchMock.mockImplementation(async () => Response.json(row));
                // eslint-disable-next-line no-await-in-loop
                await assert.rejects(requireEventAccess("verified-id"), ForbiddenError);
            }
            for (const body of [
                {},
                [null],
                [{ role: 1, other_roles: [] }],
                [{ role: "donator", other_roles: "broken" }],
                [{ role: "donator", other_roles: {} }],
                [{ role: "donator", other_roles: [1] }],
                [{ role: "donator" }],
                [{ role: "moderator", other_roles: "broken" }],
                [{ role: "member", other_roles: { role: "helper" } }],
            ]) {
                bots.fetchMock.mockImplementation(async () => Response.json(body));
                // eslint-disable-next-line no-await-in-loop
                await assert.rejects(requireEventAccess("verified-id"), ServiceUnavailableError);
            }
            bots.fetchMock.mockImplementation(
                async () => new Response("secret upstream text", { status: 500 }),
            );
            await assert.rejects(requireEventAccess("verified-id"), ServiceUnavailableError);
            bots.fetchMock.mockImplementation(async () => {
                throw new Error("secret network detail");
            });
            await assert.rejects(requireEventAccess("verified-id"), ServiceUnavailableError);
            bots.fetchMock.mockImplementation(async () => new Response("not json"));
            await assert.rejects(requireEventAccess("verified-id"), ServiceUnavailableError);
            delete process.env["BOTS_SUPABASE_SERVICE_ROLE_KEY"];
            bots.fetchMock.mockImplementation(async () =>
                Response.json([{ role: "donator", other_roles: [] }]),
            );
            await requireEventAccess("verified-id");
            expect(bots.fetchMock.mock.calls.at(-1)?.[1]?.headers).toMatchObject({
                apikey: "synthetic-publishable-key",
            });
            delete process.env["BOTS_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];
            const beforeMissing = bots.fetchMock.mock.calls.length;
            await assert.rejects(requireEventAccess("verified-id"), ServiceUnavailableError);
            expect(bots.fetchMock.mock.calls.length).toBe(beforeMissing);
            process.env["BOTS_SUPABASE_SERVICE_ROLE_KEY"] = "synthetic-service-key";
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"] = "bad-url";
            await assert.rejects(requireEventAccess("verified-id"), ServiceUnavailableError);
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"] = "https://synthetic-bots.invalid";
            bots.fetchMock.mockImplementation(
                async () => new Response(new ReadableStream({ start(): void {} })),
            );
            await assert.rejects(requireEventAccess("verified-id"), ServiceUnavailableError);

            for (const command of [
                "excorpses",
                "ff",
                "hsonly",
                "lifesteal",
                "gravity",
                "tiny",
                "fog",
                "faultyfacility",
            ]) {
                expect(eventRequiresDonor(` /${command.toUpperCase()} `)).toBe(false);
            }
            expect(eventRequiresDonor(" /TRAITOR ")).toBe(true);
            expect(eventRequiresDonor("musicalchairs 2")).toBe(true);
            expect(eventRequiresDonor("tiny;traitor")).toBe(true);
            const catalog = {
                id: 1,
                name: "Test",
                description: "",
                image: null,
                cost: 10,
                category: "modifier",
                requiresDonor: true,
                requiresStaff: false,
                comingSoon: false,
            };
            EVENT_CATALOG.validate(catalog);
            EVENT_ADMIN_CATALOG.validate({
                ...catalog,
                command: "traitor",
                enabled: true,
                supported: true,
            });
            expect(() =>
                EVENT_CATALOG.validate({ ...catalog, requiresDonor: undefined }),
            ).toThrow();
            const input = {
                buyerId: "verified-id",
                eventId: 1,
                serverId: "1",
                expectedPrice: 10,
                requestId: crypto.randomUUID(),
            } as const;
            expect(() =>
                EVENT_PURCHASE.validate({ ...input, buyerId: undefined, isDonor: true }),
            ).toThrow();
            let command = "traitor";
            const queries: string[] = [];
            const tx = async (strings: TemplateStringsArray): Promise<unknown[]> => {
                const text = strings.join("?").replace(/\s+/g, " ").trim();
                queries.push(text);
                if (text.startsWith("SELECT * FROM public_event_catalog"))
                    return [{ ...catalog, command, enabled: true }];
                if (text.startsWith("SELECT id, enabled")) return [{ id: "1", enabled: true }];
                if (text.startsWith("SELECT id, username"))
                    return [{ id: input.buyerId, username: "Test", steam_id: "steam" }];
                if (text.startsWith("UPDATE steam_users")) return [{ balance: "90" }];
                if (text.startsWith("INSERT INTO public_event_orders")) return [{ id: "1" }];
                if (text.startsWith("SELECT COUNT")) return [{ count: "1" }];
                return [];
            };
            setPostgres({
                begin: (work: (sql: typeof tx) => Promise<unknown>) => work(tx),
            } as unknown as SQL);
            bots.fetchMock.mockImplementation(async () =>
                Response.json([{ role: "member", other_roles: ["EditEconomyRewards"] }]),
            );
            await assert.rejects(purchasePublicEvent(input), {
                name: "ForbiddenError",
                message:
                    "Only donators and staff can purchase events. Other members can purchase modifiers.",
            });
            expect(
                queries.some(
                    (text) =>
                        text.startsWith("UPDATE steam_users") ||
                        text.startsWith("INSERT INTO public_event_orders"),
                ),
            ).toBe(false);
            expect(
                new URL(String(bots.fetchMock.mock.calls.at(-1)?.[0])).searchParams.get(
                    "discord_id",
                ),
            ).toBe("eq.verified-id");
            bots.fetchMock.mockImplementation(async () =>
                Response.json([{ role: "member", other_roles: '[" DISCORD-STAFF "]' }]),
            );
            expect((await purchasePublicEvent(input)).balance).toBe(90);
            command = "tiny";
            delete process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"];
            const beforeModifier = bots.fetchMock.mock.calls.length;
            expect((await purchasePublicEvent(input)).balance).toBe(90);
            expect(bots.fetchMock.mock.calls.length).toBe(beforeModifier);
            for (const removed of [
                "everythingexplodes",
                " /EVERYTHINGEXPLODES ",
                "everythingexplodes 1",
            ]) {
                command = removed;
                queries.length = 0;
                // eslint-disable-next-line no-await-in-loop
                await assert.rejects(purchasePublicEvent(input), {
                    name: "NotFoundError",
                    message:
                        "This event is no longer available, you might need to refresh your page.",
                });
                expect(bots.fetchMock.mock.calls.length).toBe(beforeModifier);
                expect(queries.some((text) => /^(INSERT|UPDATE|DELETE)/.test(text))).toBe(false);
            }
        } finally {
            bots.restore();
        }
    },
    10000,
);

test.serial(
    "event eligibility failures return safe diagnostic titles before charging",
    async () => {
        const bots = mockBotsRoles();
        const expectUnavailable = async (title: string): Promise<void> => {
            await assert.rejects(requireEventAccess("verified-id"), (error: unknown) => {
                assert(error instanceof ServiceUnavailableError);
                error.makeResponse({
                    status(status: number) {
                        expect(status).toBe(503);
                        return {
                            json(body: { title: string; description: string }): void {
                                expect(body.title).toBe(title);
                                expect(body.description).toContain("No credits were charged");
                                expect(JSON.stringify(body)).not.toMatch(
                                    /synthetic-service-key|secret upstream/,
                                );
                            },
                        };
                    },
                } as unknown as Parameters<ServiceUnavailableError["makeResponse"]>[0]);
                return true;
            });
        };
        try {
            delete process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"];
            await expectUnavailable("Event Access Configuration Missing");
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"] = "invalid-url";
            await expectUnavailable("Event Access Configuration Invalid");
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"] = "https://synthetic-bots.invalid";
            for (const status of [401, 403]) {
                bots.fetchMock.mockImplementation(
                    async () => new Response("secret upstream", { status }),
                );
                // eslint-disable-next-line no-await-in-loop
                await expectUnavailable("Event Access Credentials Rejected");
            }
            bots.fetchMock.mockImplementation(async () => {
                throw new Error("secret upstream");
            });
            await expectUnavailable("Event Access Datasource Unavailable");
            bots.fetchMock.mockImplementation(async () => Response.json({ unexpected: true }));
            await expectUnavailable("Event Access Response Invalid");
        } finally {
            bots.restore();
        }
    },
);
