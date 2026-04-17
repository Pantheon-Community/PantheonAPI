import { pg } from "@/global/pg";
import type { SteamUserModel } from "@/models/SteamUserModel";
import { fetchMeSteamConnections } from "@/other/discord/main/fetchMeSteamConnections";
import { getSteamUserInfo } from "@/other/steam/getSteamUserInfo";
import type { UserToken } from "@/shared/types/Common";
import type { SteamUser } from "@/shared/types/SteamUser";
import type { DiscordSteamConnection } from "@/types/Discord";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

/** Fetches the Steam connections of the given Discord user and upserts them in the database. */
export async function steamConnectionService(
    token: UserToken,
    timer: ServerTimer,
): Promise<SteamUser[]> {
    const steamConnections = await fetchMeSteamConnections(token, timer);

    if (steamConnections.length === 0) {
        return [];
    }

    using _ = timer.create("registerConnections");

    return await Promise.all(steamConnections.slice(0, 5).map(registerConnection));
}

type UpsertedSteamUser = Pick<
    SteamUserModel,
    "avatar" | "location" | "member_since" | "first_seen_at" | "last_seen_at" | "times_seen"
>;

async function registerConnection(connection: DiscordSteamConnection): Promise<SteamUser> {
    const { id, username } = connection;

    const insert: Partial<SteamUserModel> = {
        id,
        username,
    };

    const update: Partial<SteamUserModel> = {
        username,
    };

    const { avatar, location, memberSince } = await getSteamUserInfo(connection.id);

    // by never including null values in the update payload, we effectively "remember"
    // previously-public data (although avatar links will likely not work)

    if (avatar) insert.avatar = update.avatar = avatar;
    if (location) insert.location = update.location = location;
    if (memberSince) insert.member_since = update.member_since = memberSince;

    try {
        const [steamUser] = await pg<[UpsertedSteamUser]>`
            INSERT INTO steam_users ${sql(insert)}
            ON CONFLICT (id) DO UPDATE
            SET ${sql(update)}
            RETURNING avatar, location, member_since, first_seen_at, last_seen_at, times_seen
        `;

        return {
            id,
            username,
            avatar: steamUser.avatar,
            location: steamUser.location,
            memberSince: steamUser.member_since?.toISOString() ?? null,
            analytics:
                steamUser.first_seen_at && steamUser.last_seen_at
                    ? {
                          firstSeenAt: steamUser.first_seen_at.toISOString(),
                          lastSeenAt: steamUser.last_seen_at.toISOString(),
                          timesSeen: steamUser.times_seen,
                      }
                    : null,
        };
    } catch (error) {
        throw wrapPgError(error);
    }
}
