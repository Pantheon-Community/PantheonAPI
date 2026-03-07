import { pg } from "@/global/pg";
import type { SteamUserBasicWithTimes } from "@/shared/types/SteamUser";
import type { DiscordSteamConnection } from "@/types/Discord";
import { wrapPgError } from "../utils/handlePgError";
import type { SteamUserModel } from "./steamUserModel";

type InsertQuery = Pick<SteamUserModel, "id" | "username" | "first_seen_at" | "last_seen_at">;

export async function upsertSteamUserFromDiscord(
    connection: DiscordSteamConnection,
): Promise<SteamUserBasicWithTimes> {
    const { id, username } = connection;

    try {
        const [createdUser] = await pg<[InsertQuery]>`
            INSERT INTO steam_users (id, username)
            VALUES (${id}, ${username})
            ON CONFLICT (id) DO UPDATE SET username = ${username}
            RETURNING id, username, first_seen_at, last_seen_at
        `;

        const { first_seen_at, last_seen_at } = createdUser;

        return {
            id,
            username,
            firstSeenAt: first_seen_at !== null ? first_seen_at.toISOString() : null,
            lastSeenAt: last_seen_at !== null ? last_seen_at.toISOString() : null,
        };
    } catch (error) {
        throw wrapPgError(error);
    }
}
