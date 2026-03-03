import { sql } from "bun";
import { pg } from "@/global/pg";
import type { DiscordId, SteamId64 } from "@/shared/types/Common";
import { wrapPgError } from "../utils/handlePgError";

export interface BasicSteamInfoByDiscordId {
	discordid: DiscordId;

	steamid: SteamId64;

	steamusername: string;
}

export async function getBasicSteamInfoByDiscordIds(
	ids: DiscordId[],
): Promise<BasicSteamInfoByDiscordId[]> {
	try {
		return await pg`
            SELECT
                users.id AS discordid,
                steam_users.id AS steamid,
                steam_users.username AS steamusername
            FROM steam_users
            JOIN users ON users.steam_id = steam_users.id
            WHERE users.id = ANY(${sql.array(ids, "TEXT")})
        `;
	} catch (error) {
		throw wrapPgError(error);
	}
}
