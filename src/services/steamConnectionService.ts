import { pg } from "@/global/pg";
import type { SteamUserModel } from "@/models/SteamUserModel";
import { fetchMeSteamConnections } from "@/other/discord/main/fetchMeSteamConnections";
import { getSteamUserInfo } from "@/other/steam/getSteamUserInfo";
import type { UserToken } from "@/shared/types/Common";
import type { SteamUser } from "@/shared/types/SteamUser";
import type { DiscordSteamConnection } from "@/types/Discord";
import type { ServerTimer } from "@/utils/serverTimer";
import { sql } from "bun";

/** Fetches the Steam connections of the given Discord user and upserts them in the database. */
export async function steamConnectionService(
    token: UserToken,
    timer: ServerTimer,
): Promise<SteamUser[]> {
    const steamConnections = await fetchMeSteamConnections(token, timer);

    if (steamConnections.length === 0) {
        return [];
    }

    using _ = timer.create("registerConnections");

    return await Promise.all(steamConnections.slice(0, 5).map(registerConnection));
}

async function registerConnection(connection: DiscordSteamConnection): Promise<SteamUser> {
    const { id, username } = connection;

    const insert: Partial<SteamUserModel> = {
        id,
        username,
    };

    const update: Partial<SteamUserModel> = {
        username,
    };

    const userInfo = await getSteamUserInfo(connection.id);

    // by never including null values in the update payload, we effectively "remember"
    // previously-public data (although avatar links will likely not work)

    if (userInfo.avatar) insert.avatar = update.avatar = userInfo.avatar;
    if (userInfo.location) insert.location = update.location = userInfo.location;
    if (userInfo.memberSince) insert.member_since = update.member_since = userInfo.memberSince;

    const [steamUser] = await pg<[SteamUserModel]>`
            INSERT INTO steam_users ${sql(insert)}
            ON CONFLICT (id) DO UPDATE
            SET ${sql(update)}
            RETURNING *
        `;

    const {
        avatar,
        location,
        member_since,
        group_name,
        first_seen_at,
        last_seen_at,
        times_seen,
        balance,
        lifetime_balance,
        lifetime_purchase_count,
        last_login_bonus_given_at,
        login_streak,
    } = steamUser;

    return {
        id,
        username,
        avatar: avatar,
        location: location,
        memberSince: member_since?.toISOString() ?? null,
        groupName: group_name,
        analytics:
            first_seen_at && last_seen_at
                ? {
                      firstSeenAt: first_seen_at.toISOString(),
                      lastSeenAt: last_seen_at.toISOString(),
                      timesSeen: times_seen,
                  }
                : null,
        economyStats: {
            balance,
            lifetimeBalance: lifetime_balance,
            lifetimePurchaseCount: lifetime_purchase_count,
            lastLoginBonusGivenAt: last_login_bonus_given_at?.toISOString() ?? null,
            loginStreak: login_streak,
        },
    };
}
