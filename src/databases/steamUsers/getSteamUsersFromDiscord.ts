import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";
import type { SteamUserFromDiscord } from "@/shared/types/SteamUserFromDiscord";
import type { ServerTimer } from "@/utils/serverTimer";
import { sql } from "bun";
import type { UserModel } from "../users/userModel";
import { wrapPgError } from "../utils/handlePgError";
import type { SteamUserModel } from "./steamUserModel";

interface SelectResult {
    discord_id: UserModel["id"];

    steam_id: SteamUserModel["id"];

    steam_username: SteamUserModel["username"];

    steam_avatar: SteamUserModel["avatar"];
}

export async function getSteamUsersFromDiscord(
    ids: DiscordId[],
    timer: ServerTimer,
): Promise<SteamUserFromDiscord[]> {
    using _ = timer.create("getSteamUsersFromDiscord");

    try {
        const steamUsers = await pg<SelectResult[]>`
            SELECT
                steam_users.id AS steam_id,
                steam_users.username AS steam_username,
                steam_users.avatar AS steam_avatar,
                users.id AS discord_id
            FROM steam_users
            JOIN users ON users.steam_id = steam_users.id
            WHERE users.id = ANY(${sql.array(ids, "TEXT")})
        `;

        return steamUsers.map((x) => ({
            discordId: x.discord_id,
            steamId: x.steam_id,
            steamUsername: x.steam_username,
            steamAvatar: x.steam_avatar,
        }));
    } catch (error) {
        throw wrapPgError(error);
    }
}
