import { pg } from "@/global/pg";
import type { EarningsModel } from "@/models/EarningsModel";
import type { UserModel } from "@/models/UserModel";
import type { PluginTokenId } from "@/shared/types/PluginToken";
import { EARNINGS_REQUEST, type EarningsRequest } from "@/shared/types/Requests/EarningsRequest";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import type { ServerTimer } from "@/utils/serverTimer";
import { makeArray } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

export const postEarnings: Endpoint<EarningsRequest[]> = {
    method: "post",
    path: "/economy/earnings",
    auth: AuthScope.Plugin,
    description: "Updates the balance of users from in-game earnings.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent,
    requestBody: makeArray(EARNINGS_REQUEST, 1, 100),
    responseBody: null,
    pathParams: null,
    queryParams: null,
    async handleRequest({ req, timer, plugin }) {
        const earnings = req.body;

        await Promise.all([
            increaseBalances(earnings, timer).then((users) =>
                addEarningRecords(users, plugin, timer),
            ),
            upsertAnalytics(earnings, timer),
        ]);
    },
};

interface EarningFull extends EarningsRequest {
    id: UserModel["id"];
}

async function increaseBalances(
    earnings: EarningsRequest[],
    timer: ServerTimer,
): Promise<EarningFull[]> {
    using _ = timer.create("increaseBalances");

    const users = await Promise.all(earnings.map(increaseBalanceFor));

    return users.flatMap((x) => x);
}

async function increaseBalanceFor(earning: EarningsRequest): Promise<EarningFull[]> {
    const { steamId, balanceInc } = earning;

    try {
        const users = await pg<Pick<UserModel, "id">[]>`
            UPDATE users
            SET
                balance = balance + ${balanceInc},
                lifetime_balance = lifetime_balance + ${balanceInc}
            WHERE steam_id = ${steamId}
            RETURNING id
        `;

        return users.map((x) => Object.assign(x, earning));
    } catch (error) {
        throw wrapPgError(error);
    }
}

async function upsertAnalytics(earnings: EarningsRequest[], timer: ServerTimer): Promise<void> {
    using _ = timer.create("upsertAnalytics");

    await Promise.all(earnings.map(upsertAnalyticsFor));
}

async function upsertAnalyticsFor(earning: EarningsRequest): Promise<void> {
    const { steamId, username } = earning;

    try {
        await pg`
            INSERT INTO steam_users (id, username, first_seen_at, last_seen_at, times_seen)
            VALUES (${steamId}, ${username}, NOW(), NOW(), 1)
            ON CONFLICT (id) DO UPDATE SET
                username = ${username},
                first_seen_at = COALESCE(steam_users.first_seen_at, NOW()),
                last_seen_at = NOW(),
                times_seen = steam_users.times_seen + 1
        `;
    } catch (error) {
        throw wrapPgError(error);
    }
}

async function addEarningRecords(
    users: EarningFull[],
    plugin: PluginTokenId,
    timer: ServerTimer,
): Promise<void> {
    using _ = timer.create("addEarningRecords");

    const values = users.map<Partial<EarningsModel>>((x) => ({
        user_id: x.id,
        steam_id: x.steamId,
        amount: x.balanceInc,
        made_by: plugin,
    }));

    try {
        await pg`INSERT INTO earnings ${sql(values)}`;
    } catch (error) {
        throw wrapPgError(error);
    }
}
