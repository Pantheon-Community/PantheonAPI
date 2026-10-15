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
export async function requireEventAccess(
    discordId: string,
    accessToken?: string,
    userAgent?: string,
): Promise<void> {
    let roles: string[] = [];
    let websiteAllowed = false;
    let failure:
        | "Configuration Missing"
        | "Configuration Invalid"
        | "Credentials Rejected"
        | "Datasource Unavailable"
        | "Verification Timed Out"
        | "Response Invalid" = "Configuration Invalid";
    try {
        const base = process.env["BOTS_NEXT_PUBLIC_SUPABASE_URL"]?.trim();
        const key =
            process.env["BOTS_SUPABASE_SERVICE_ROLE_KEY"]?.trim() ||
            process.env["BOTS_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"]?.trim();
        const useWebsite = (!base || !key) && !!accessToken;
        if ((!base || !key) && !useWebsite) {
            failure = "Configuration Missing";
            throw new Error("Missing datasource configuration");
        }
        const query = new URL(
            useWebsite
                ? "https://pantheoncommunity.org/api/events/eligibility"
                : `${base!.replace(/\/+$/, "")}/rest/v1/roles`,
        );
        if (!["https:", "http:"].includes(query.protocol) || query.username || query.password)
            throw new Error("Invalid datasource URL");
        if (!useWebsite) {
            query.searchParams.set("select", "role,other_roles");
            query.searchParams.set("discord_id", `eq.${discordId}`);
            query.searchParams.set("limit", "1");
        }
        failure = "Datasource Unavailable";

        // Bound both fetch and body parsing, including a stalled response body.
        const controller = new AbortController();
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const rows: unknown = await Promise.race([
            (async (): Promise<unknown> => {
                const response = await fetch(query.toString(), {
                    headers: useWebsite
                        ? {
                              Authorization: `Bearer ${accessToken}`,
                              Accept: "application/json",
                              ...(userAgent ? { "User-Agent": userAgent } : {}),
                          }
                        : {
                              apikey: key!,
                              Authorization: `Bearer ${key}`,
                              Accept: "application/json",
                              "Accept-Profile": "public",
                          },
                    cache: "no-store",
                    signal: controller.signal,
                    redirect: "error",
                });
                if (useWebsite && [401, 403, 423].includes(response.status)) {
                    return { discordId, canPurchaseEvents: false };
                }
                if (!response.ok) {
                    failure =
                        response.status === 401 || response.status === 403
                            ? "Credentials Rejected"
                            : "Datasource Unavailable";
                    throw new Error("Datasource request failed");
                }
                failure = "Response Invalid";
                return await response.json();
            })(),
            new Promise<never>((_, reject) => {
                timeout = setTimeout(
                    () => {
                        controller.abort();
                        failure = "Verification Timed Out";
                        reject(new Error("Datasource timeout"));
                    },
                    useWebsite ? 10000 : EVENT_ACCESS_LOOKUP_TIMEOUT_MS,
                );
            }),
        ]).finally(() => clearTimeout(timeout));

        if (useWebsite) {
            // Bind the trusted HTTPS response to the API-verified session, never to client claims.
            if (!rows || typeof rows !== "object" || Array.isArray(rows))
                throw new Error("Invalid eligibility response");
            const result = rows as Record<string, unknown>;
            if (
                result["discordId"] !== discordId ||
                typeof result["canPurchaseEvents"] !== "boolean"
            )
                throw new Error("Invalid eligibility response");
            websiteAllowed = result["canPurchaseEvents"];
        } else {
            if (!Array.isArray(rows) || rows.length > 1) throw new Error("Invalid roles response");
            if (rows.length) {
                const row: unknown = rows[0];
                if (!row || typeof row !== "object" || Array.isArray(row))
                    throw new Error("Invalid role row");
                const { role, other_roles: secondary } = row as Record<string, unknown>;
                if (role !== null && typeof role !== "string")
                    throw new Error("Invalid primary role");
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
        }
    } catch {
        // Never propagate upstream bodies, URLs, keys, or raw fetch errors to logs/clients.
        throw new ServiceUnavailableError({
            title: `Event Access ${failure}` as const,
            description:
                "Cannot verify event purchase eligibility right now. No credits were charged.",
        });
    }
    if (!websiteAllowed && !roles.some((role) => STAFF_ROLES.has(role) || DONOR_ROLES.has(role))) {
        throw new ForbiddenError({
            title: "Event Access Required",
            description:
                "Only donators and staff can purchase events. Other members can purchase modifiers.",
        });
    }
}
