import { pg } from "@/global/pg";
import type { SteamUserBasicWithTimes } from "@/shared/types/SteamUser";
import type { UserBasicWithSteam } from "@/shared/types/User";
import type { DiscordUser } from "@/types/Discord";
import type { RequestAnalytics } from "@/types/RequestAnalytics";
import { wrapPgError } from "../utils/handlePgError";
import type { UserModel } from "./userModel";

type InsertQuery = Pick<UserModel, "id" | "username" | "avatar">;

export async function upsertUser(
    discord: DiscordUser,
    steam: SteamUserBasicWithTimes | null,
    analytics: RequestAnalytics,
): Promise<UserBasicWithSteam> {
    const { id, username, global_name, avatar } = discord;
    const { ip, userAgent, origin } = analytics;

    const finalUsername = global_name ?? username;

    const steamId = steam !== null ? steam.id : null;

    try {
        const [createdUser] = await pg<[InsertQuery]>`
            INSERT INTO users (id, username, avatar, steam_id, ip, user_agent, origin)
            VALUES (${id}, ${finalUsername}, ${avatar}, ${steamId}, ${ip}, ${userAgent}, ${origin})
            ON CONFLICT (id) DO UPDATE SET
                username = ${finalUsername},
                avatar = ${avatar},
                last_seen_at = NOW(),
                ip = ${ip},
                user_agent = ${userAgent},
                origin = ${origin}
            RETURNING id, username, avatar
        `;

        Object.assign(createdUser, { steam });

        return createdUser as UserBasicWithSteam;
    } catch (error) {
        throw wrapPgError(error);
    }
}
