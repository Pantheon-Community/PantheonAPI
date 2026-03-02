import { pg } from "@/global/pg";
import type { DiscordSteamConnection } from "@/types/Discord";
import { wrapPgError } from "../utils/handlePgError";
import type { SteamUserModel } from "./model/steamUserModel";

export async function upsertSteamUserFromDiscord(
	connection: DiscordSteamConnection,
): Promise<SteamUserModel> {
	const { id, username } = connection;

	try {
		const [result] = await pg<[SteamUserModel]>`
            INSERT INTO steam_users (id, username)
            VALUES (${id}, ${username})
            ON CONFLICT (id) DO UPDATE SET username = ${username}
            RETURNING *
        `;

		return result;
	} catch (error) {
		throw wrapPgError(error);
	}
}
