import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";
import type { SteamUserFromDiscord } from "@/shared/types/SteamUserFromDiscord";
import { sql } from "bun";
import type { UserModel } from "../users/userModel";
import { wrapPgError } from "../utils/handlePgError";
import type { SteamUserModel } from "./steamUserModel";

interface SelectResult extends Pick<SteamUserModel, "id" | "username"> {
    discord_id: UserModel["id"];
}

export async function getSteamUsersFromDiscord(ids: DiscordId[]): Promise<SteamUserFromDiscord[]> {
    try {
        const steamUsers = await pg<SelectResult[]>`
            SELECT
                steam_users.id,
                steam_users.username,
                users.id AS discord_id
            FROM steam_users
            JOIN users ON users.steam_id = steam_users.id
            WHERE users.id = ANY(${sql.array(ids, "TEXT")})
        `;

        return steamUsers.map((x) => ({
            discordId: x.discord_id,
            steamId: x.id,
            steamUsername: x.username,
        }));
    } catch (error) {
        throw wrapPgError(error);
    }
}
