import { pg } from "@/global/pg";
import type { SteamId64 } from "@/shared/types/Common";
import type { UserFromSteam } from "@/shared/types/UserFromSteam";
import { sql } from "bun";
import { wrapPgError } from "../utils/handlePgError";
import type { UserModel } from "./userModel";

interface SelectQuery {
    steam_id: NonNullable<UserModel["steam_id"]>;

    discord_id: UserModel["id"];

    discord_username: UserModel["username"];

    discord_avatar: UserModel["avatar"];
}

export async function getDiscordUserBySteam(steamIds: SteamId64[]): Promise<UserFromSteam[]> {
    try {
        const users = await pg<SelectQuery[]>`
            SELECT
                users.steam_id AS steam_id,
                users.id AS discord_id,
                users.username AS discord_username,
                users.avatar AS discord_avatar
            FROM users
            WHERE steam_id = ANY(${sql.array(steamIds, "TEXT")})
        `;

        return users.map((x) => ({
            steamId: x.steam_id,
            discordId: x.discord_id,
            discordUsername: x.discord_username,
            discordAvatar: x.discord_avatar,
        }));
    } catch (error) {
        throw wrapPgError(error);
    }
}
