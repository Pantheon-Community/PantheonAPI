import type { DiscordId } from "@/shared/types/Common";
import type { SteamUserFromDiscord } from "@/shared/types/SteamUserFromDiscord";
import type { ServerTimer } from "@/utils/serverTimer";
import { sql } from "bun";
import { steamUsersDb } from "../steamUsers";
import { usersDb } from "../users";
import { Database } from "../utils/database";

export async function joinSteamUsersFromDiscord(
    ids: DiscordId[],
    timer: ServerTimer,
): Promise<SteamUserFromDiscord[]> {
    using _ = timer.create("getSteamUsersFromDiscord");

    const steamUsers = await Database.joinSimple(
        {
            from: steamUsersDb,
            select: ["id", "username", "avatar"],
            join: "id",
        },
        {
            from: usersDb,
            select: ["id"],
            join: "steam_id",
        },
        sql`users.id = ANY(${sql.array(ids, "TEXT")})`,
        "inner",
    );

    return steamUsers.map<SteamUserFromDiscord>((x) => ({
        discordId: x.users_id,
        steamId: x.steam_users_id,
        steamUsername: x.steam_users_username,
        steamAvatar: x.steam_users_avatar ?? null,
    }));
}
