import { pg } from "@/global/pg";
import { type UserModel } from "@/models/UserModel";
import { fetchMe } from "@/other/discord/main/fetchMe";
import type { UserToken } from "@/shared/types/Common";
import type { Fingerprint } from "@/shared/types/Fingerprint";
import type { GetMeResponse } from "@/shared/types/Responses/GetMeResponse";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";
import { steamConnectionService } from "./steamConnectionService";

type UpsertedUser = Pick<
    UserModel,
    "steam_id" | "balance" | "lifetime_balance" | "lifetime_purchase_count"
>;

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

    using _ = timer.create("upsertUser");

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

    try {
        const [user] = await pg<[UpsertedUser]>`
            INSERT INTO users ${sql(insert)}
            ON CONFLICT (id) DO UPDATE
            SET ${sql(update)}, last_seen_at = NOW()
            RETURNING steam_id, balance, lifetime_balance, lifetime_purchase_count
        `;

        return {
            user: {
                id,
                username,
                avatar,
                steamId: user.steam_id,
                economyStats: {
                    balance: user.balance,
                    lifetimeBalance: user.lifetime_balance,
                    lifetimePurchaseCount: user.lifetime_purchase_count,
                },
            },
            steamUsers,
        };
    } catch (error) {
        throw wrapPgError(error);
    }
}
