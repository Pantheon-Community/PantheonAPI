import { ForbiddenError } from "@/errors/ForbiddenError";
import { ServiceUnavailableError } from "@/errors/ServiceUnavailableError";

const DONOR_ROLES = new Set(["donator", "d1bronze", "d2silver", "d3gold", "d4mega", "d5mega"]);
// HELPER and above in the web permissionLevels mappings, including generic helper.
const STAFF_ROLES = new Set([
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
]);
const ROLE_ALIASES: Record<string, string> = {
    management: "manager",
    "discord-staff": "discordstaff",
    "scpsl-staff": "scpslstaff",
};
export const EVENT_ACCESS_LOOKUP_TIMEOUT_MS = 3000;

/** Only call for new restricted purchases, with the verified session's Discord ID. */
export async function requireEventAccess(discordId: string, staffOnly = false): Promise<void> {
    let roles: string[];
    try {
        const base = process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"];
        const key =
            process.env["BOTS_SUPABASE_SERVICE_ROLE_KEY"] ??
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];
        if (!base || !key) throw new Error("Missing datasource configuration");
        const query = new URL(`${base.replace(/\/+$/, "")}/rest/v1/roles`);
        if (!["https:", "http:"].includes(query.protocol) || query.username || query.password)
            throw new Error("Invalid datasource URL");
        query.searchParams.set("select", "role,other_roles");
        query.searchParams.set("discord_id", `eq.${discordId}`);
        query.searchParams.set("limit", "1");

        // Bound both fetch and body parsing, including a stalled response body.
        const controller = new AbortController();
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const rows: unknown = await Promise.race([
            (async (): Promise<unknown> => {
                const response = await fetch(query.toString(), {
                    headers: {
                        apikey: key,
                        Authorization: `Bearer ${key}`,
                        Accept: "application/json",
                        "Accept-Profile": "public",
                    },
                    cache: "no-store",
                    signal: controller.signal,
                    redirect: "error",
                });
                if (!response.ok) throw new Error("Datasource request failed");
                return await response.json();
            })(),
            new Promise<never>((_, reject) => {
                timeout = setTimeout(() => {
                    controller.abort();
                    reject(new Error("Datasource timeout"));
                }, EVENT_ACCESS_LOOKUP_TIMEOUT_MS);
            }),
        ]).finally(() => clearTimeout(timeout));

        if (!Array.isArray(rows) || rows.length > 1) throw new Error("Invalid roles response");
        roles = [];
        if (rows.length) {
            const row: unknown = rows[0];
            if (!row || typeof row !== "object" || Array.isArray(row))
                throw new Error("Invalid role row");
            const { role, other_roles: secondary } = row as Record<string, unknown>;
            if (role !== null && typeof role !== "string") throw new Error("Invalid primary role");
            let others: unknown = secondary;
            if (typeof others === "string") others = others.trim() ? JSON.parse(others) : [];
            if (others === null) others = [];
            if (!Array.isArray(others) || !others.every((value) => typeof value === "string"))
                throw new Error("Invalid secondary roles");
            roles = [role ?? "", ...others].map((value: string) => {
                const normalized = value.trim().toLowerCase();
                return Object.hasOwn(ROLE_ALIASES, normalized)
                    ? ROLE_ALIASES[normalized]!
                    : normalized;
            });
        }
    } catch {
        // Never propagate upstream bodies, URLs, keys, or raw fetch errors to logs/clients.
        throw new ServiceUnavailableError({
            title: "Event Access Verification Unavailable",
            description:
                "Cannot verify event purchase eligibility right now. Please try again later.",
        });
    }
    if (!roles.some((role) => STAFF_ROLES.has(role) || (!staffOnly && DONOR_ROLES.has(role)))) {
        throw new ForbiddenError({
            title: staffOnly ? "Staff Access Required" : "Event Access Required",
            description: staffOnly
                ? "Only staff can purchase Everything Explodes."
                : "Only donators and staff can purchase events. Other members can purchase non-staff modifiers.",
        });
    }
}
