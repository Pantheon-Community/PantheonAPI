import { pg } from "@/global/pg";
import type { SteamConnection } from "@/shared/types/SteamConnection";
import type { User } from "@/shared/types/User";
import type { DiscordUser } from "@/types/Discord";
import { convertToUser, type UserModel } from "./base/UserModel";

export async function upsertUser(
	discordData: DiscordUser,
	steamData: SteamConnection | undefined,
	ip: string | undefined,
): Promise<User> {
	const { id, username, avatar } = discordData;

	ip ||= "unknown";

	const [result] = await pg<[UserModel]>`
        INSERT INTO users (
            id,
            username,
            avatar,
            latest_ip,
            steam_id,
            steam_username
        ) VALUES (
            ${id},
            ${username},
            ${avatar},
            ${ip},
            ${steamData?.id ?? null},
            ${steamData?.username ?? null}
        ) ON CONFLICT (id) DO UPDATE SET
            username = ${username},
            avatar = ${avatar},
            latest_ip = ${ip},
            last_seen_at = NOW()
        RETURNING *
    `;

	// Technically it is possible that session count updating fails here, if the user was deleted
	// in the time between these 2 queries. However updating session count isn't that big a deal,
	// so errors here are swallowed.
	pg`UPDATE users SET session_count = session_count + 1 WHERE id = ${id}`.catch(() => null);

	return convertToUser(result);
}
