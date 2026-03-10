import { pg } from "@/global/pg";
import type { SteamUserBasicWithTimes } from "@/shared/types/SteamUser";
import type { DiscordSteamConnection } from "@/types/Discord";
import type { SteamUserInfo } from "@/types/SteamUserInfo";
import { wrapPgError } from "../utils/handlePgError";
import type { SteamUserModel } from "./steamUserModel";

type InsertQuery = Pick<SteamUserModel, "first_seen_at" | "last_seen_at">;

export async function upsertSteamUserFromDiscord(
    connection: DiscordSteamConnection,
    info: SteamUserInfo,
): Promise<SteamUserBasicWithTimes> {
    const { id, username } = connection;
    const { avatar, location, memberSince } = info;

    try {
        const [createdUser] = await pg<[InsertQuery]>`
            INSERT INTO steam_users (id, username, avatar, location, member_since)
            VALUES (${id}, ${username}, ${avatar}, ${location}, ${memberSince})
            ON CONFLICT (id) DO UPDATE SET
                username = ${username},
                avatar = ${avatar},
                location = ${location},
                member_since = ${memberSince}
            RETURNING first_seen_at, last_seen_at
        `;

        const { first_seen_at, last_seen_at } = createdUser;

        return {
            id,
            username,
            avatar,
            location,
            memberSince: memberSince !== null ? memberSince.toISOString() : null,
            firstSeenAt: first_seen_at !== null ? first_seen_at.toISOString() : null,
            lastSeenAt: last_seen_at !== null ? last_seen_at.toISOString() : null,
        };
    } catch (error) {
        throw wrapPgError(error);
    }
}
