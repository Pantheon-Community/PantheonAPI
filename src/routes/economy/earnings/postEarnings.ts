import { pg } from "@/global/pg";
import type { EarningsModel } from "@/models/EarningsModel";
import type { SteamUserModel } from "@/models/SteamUserModel";
import type { PluginTokenId } from "@/shared/types/PluginToken";
import { EARNINGS_REQUEST, type EarningsRequest } from "@/shared/types/Requests/EarningsRequest";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import type { ServerTimer } from "@/utils/serverTimer";
import { makeArray } from "@/utils/specUtils";
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
        using _ = timer.create("updateSteamUsers");

        const earnings = req.body;

        await Promise.all([
            addEarningRecords(earnings, plugin, timer),
            ...earnings.map(updateSteamUser),
        ]);
    },
};

async function addEarningRecords(
    earnings: EarningsRequest[],
    plugin: PluginTokenId,
    timer: ServerTimer,
): Promise<void> {
    using _ = timer.create("addEarningRecords");

    const values = earnings.map<Partial<EarningsModel>>((x) => ({
        steam_id: x.steamId,
        amount: x.balanceInc,
        made_by: plugin,
    }));

    await pg`INSERT INTO earnings ${sql(values)}`;
}

async function updateSteamUser(earning: EarningsRequest): Promise<void> {
    const { steamId, username, balanceInc, groupName } = earning;

    let signinBonus = getDailySignInBonus(groupName);

    const [steamUser] = await pg<
        [Pick<SteamUserModel, "last_login_bonus_given_at" | "login_streak">]
    >`
        INSERT INTO steam_users (
            id,
            username,
            group_name,
            first_seen_at,
            last_seen_at,
            times_seen,
            balance,
            lifetime_balance
        ) VALUES (
            ${steamId},
            ${username},
            ${groupName},
            NOW(),
            NOW(),
            1,
            ${balanceInc},
            ${balanceInc}
        ) ON CONFLICT (id) DO UPDATE SET
            username = ${username},
            group_name = ${groupName},
            first_seen_at = COALESCE(steam_users.first_seen_at, NOW()),
            last_seen_at = NOW(),
            times_seen = steam_users.times_seen + 1,
            balance = steam_users.balance + ${balanceInc},
            lifetime_balance = steam_users.lifetime_balance + ${balanceInc}
        RETURNING last_login_bonus_given_at, login_streak
    `;

    const { last_login_bonus_given_at, login_streak } = steamUser;

    if (last_login_bonus_given_at === null) {
        // no previous streak
        await pg`
            UPDATE steam_users
            SET
                balance = balance + ${signinBonus},
                lifetime_balance = lifetime_balance + ${signinBonus},
                last_login_bonus_given_at = NOW(),
                login_streak = 1
            WHERE id = ${steamId}
        `;
    } else if (last_login_bonus_given_at < startOfYesterday()) {
        // streak broken
        await pg`
            UPDATE steam_users
            SET
                balance = balance + ${signinBonus},
                lifetime_balance = lifetime_balance + ${signinBonus},
                last_login_bonus_given_at = NOW(),
                login_streak = 1
            WHERE id = ${steamId}
        `;
    } else if (last_login_bonus_given_at < startOfToday()) {
        // streak increased

        // +10% earnings per consecutive day, max of +50% (5 days)
        signinBonus += Math.floor(signinBonus * Math.min(login_streak / 10, 0.5));

        await pg`
            UPDATE steam_users
            SET
                balance = balance + ${signinBonus},
                lifetime_balance = lifetime_balance + ${signinBonus},
                last_login_bonus_given_at = NOW(),
                login_streak = login_streak + 1
        `;
    }

    // logged in recently, no streak actions
}

function startOfToday(): Date {
    const today = new Date();

    today.setHours(0, 0, 0);

    return today;
}

function startOfYesterday(): Date {
    const d = new Date();

    d.setHours(-24, 0, 0);

    return d;
}

console.log(
    `Today is ${startOfToday().toLocaleString("en-NZ")}, Yesterday was ${startOfYesterday().toLocaleString("en-NZ")}`,
);

function getDailySignInBonus(groupName: string): number {
    // we will put these in a DB eventually
    switch (groupName) {
        case "d5mega":
        case "d4mega":
            return 350;
        case "d3gold":
            return 275;
        case "d2silver":
            return 200;
        case "d1bronze":
            return 150;
        // case "director":
        // case "manager":
        // case "supervisor":
        // case "developer":
        // case "admin":
        // case "smoderator":
        // case "moderator":
        // case "tmoderator":
        default:
            return 50;
    }
}
