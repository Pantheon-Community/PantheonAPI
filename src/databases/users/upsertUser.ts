import { pg } from "@/global/pg";
import type { SteamId64 } from "@/shared/types/Common";
import type { UserBasic } from "@/shared/types/User";
import type { DiscordUser } from "@/types/Discord";
import type { RequestAnalytics } from "@/types/RequestAnalytics";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "../utils/handlePgError";
import type { UserModel } from "./userModel";

type InsertQuery = Pick<UserModel, "steam_id">;

interface UpsertUserResult {
    upsertedUser: UserBasic;

    steamId: SteamId64 | null;
}

export async function upsertUser(
    discordUser: DiscordUser,
    steamId: SteamId64 | null,
    analytics: RequestAnalytics,
    timer: ServerTimer,
): Promise<UpsertUserResult> {
    using _ = timer.create("upsertUser");

    const { id, username, global_name, avatar } = discordUser;
    const { ip, userAgent, origin } = analytics;

    const finalUsername = global_name ?? username;

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
            RETURNING steam_id
        `;

        return {
            upsertedUser: { id, username: finalUsername, avatar },
            steamId: createdUser.steam_id,
        };
    } catch (error) {
        throw wrapPgError(error);
    }
}
