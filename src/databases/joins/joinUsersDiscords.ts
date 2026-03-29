import type {
    SteamId64,
    SteamUserAnalytics,
    SteamUserWithTimesAndDiscord,
} from "@/shared/types/SteamUser";
import type { UserBasic } from "@/shared/types/User";
import type { ServerTimer } from "@/utils/serverTimer";
import { sql } from "bun";
import { steamUsersDb } from "../steamUsers";
import { usersDb } from "../users";
import { Database } from "../utils/database";

export async function joinUsersDiscord(
    ids: SteamId64[],
    timer: ServerTimer,
): Promise<SteamUserWithTimesAndDiscord[]> {
    using _ = timer.create("joinUsersDiscord");

    const steamUsers = await Database.joinSimple(
        {
            from: steamUsersDb,
            select: [
                "id",
                "username",
                "avatar",
                "location",
                "member_since",
                "first_seen_at",
                "last_seen_at",
                "times_seen",
            ],
            join: "id",
        },
        {
            from: usersDb,
            select: ["id", "username", "avatar"],
            join: "steam_id",
        },
        sql`steam_users.id = ANY(${sql.array(ids, "TEXT")})`,
        "left",
    );

    return steamUsers.map<SteamUserWithTimesAndDiscord>((x) => {
        let analytics: SteamUserAnalytics | null;

        if (x.steam_users_first_seen_at && x.steam_users_last_seen_at && x.steam_users_times_seen) {
            analytics = {
                firstSeenAt: x.steam_users_first_seen_at.toISOString(),
                lastSeenAt: x.steam_users_last_seen_at.toISOString(),
                timesSeen: x.steam_users_times_seen,
            };
        } else {
            analytics = null;
        }

        let discord: UserBasic | null;

        if (x.users_id && x.users_username) {
            discord = {
                id: x.users_id,
                username: x.users_username,
                avatar: x.users_avatar ?? null,
            };
        } else {
            discord = null;
        }

        return {
            id: x.steam_users_id,
            username: x.steam_users_username,
            avatar: x.steam_users_avatar ?? null,
            location: x.steam_users_location ?? null,
            memberSince: x.steam_users_member_since?.toISOString() ?? null,
            analytics,
            discord,
        };
    });
}
