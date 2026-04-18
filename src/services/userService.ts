import { pg } from "@/global/pg";
import type { UserModel } from "@/models/UserModel";
import { fetchMe } from "@/other/discord/main/fetchMe";
import type { UserToken } from "@/shared/types/Common";
import type { EconomyStats } from "@/shared/types/EconomyStats";
import type { Fingerprint } from "@/shared/types/Fingerprint";
import type { GetMeResponse } from "@/shared/types/Responses/GetMeResponse";
import type { ServerTimer } from "@/utils/serverTimer";
import { sql } from "bun";
import { steamConnectionService } from "./steamConnectionService";

/**
 * Fetches the Discord user and their Steam connections, upserting both in their respective
 * databases.
 */
export async function userService(
    token: UserToken,
    fingerprint: Fingerprint,
    timer: ServerTimer,
): Promise<GetMeResponse> {
    const [discordUser, steamUsers] = await Promise.all([
        fetchMe(token, timer),
        steamConnectionService(token, timer),
    ]);

    const { id, username: fallbackUsername, global_name, avatar } = discordUser;
    const { ip, userAgent, origin } = fingerprint;

    const username = global_name ?? fallbackUsername;

    const firstSteamId = steamUsers[0]?.id;

    const insert: Partial<UserModel> = {
        id,
        username,
    };

    const update: Partial<UserModel> = {
        username,
    };

    // steam_id is only inserted, since we don't want to overwrite a previously-configured
    // primary Steam connection

    if (avatar) insert.avatar = update.avatar = avatar;
    if (firstSteamId) insert.steam_id = firstSteamId;
    if (ip) insert.ip = update.ip = ip;
    if (userAgent) insert.user_agent = update.user_agent = userAgent;
    if (origin) insert.origin = update.origin = origin;

    const [user] = await pg<[Pick<UserModel, "steam_id">]>`
            INSERT INTO users ${sql(insert)}
            ON CONFLICT (id) DO UPDATE
            SET ${sql(update)}, last_seen_at = NOW()
            RETURNING steam_id
        `;

    let economyStats: EconomyStats | null;

    if (user.steam_id) {
        economyStats = steamUsers.find((x) => x.id === user.steam_id)?.economyStats ?? null;
    }

    economyStats ??= {
        balance: 0,
        lifetimeBalance: 0,
        lifetimePurchaseCount: 0,
        lastLoginBonusGivenAt: null,
        loginStreak: 0,
    };

    return {
        user: {
            id,
            username,
            avatar,
            steamId: user.steam_id,
            economyStats,
        },
        steamUsers,
    };
}
