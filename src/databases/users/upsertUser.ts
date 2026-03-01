import { pg } from "@/global/pg";
import type { SteamId64 } from "@/shared/types/Common";
import type { DiscordUser } from "@/types/Discord";
import type { UserModel } from "./model/userModel";

export async function upsertUser(
	discord: DiscordUser,
	steamId: SteamId64 | null,
): Promise<UserModel> {
	const { id, username, global_name, avatar } = discord;

	const finalUsername = global_name ?? username;

	const [result] = await pg<[UserModel]>`
        INSERT INTO users (id, username, avatar, steam_id)
        VALUES (${id}, ${finalUsername}, ${avatar}, ${steamId})
        ON CONFLICT (id) DO UPDATE SET
            username = ${finalUsername},
            avatar = ${avatar}
        RETURNING *
    `;

	return result;
}
