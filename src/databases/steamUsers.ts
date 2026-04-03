import type { SteamId64, SteamUserAnalytics, SteamUserWithTimes } from "@/shared/types/SteamUser";
import type { DiscordSteamConnection } from "@/types/Discord";
import type { SteamUserInfo } from "@/types/SteamUserInfo";
import type { ServerTimer } from "@/utils/serverTimer";
import { Database, type InsertPayloadFor, type UpdatePayloadFor } from "./utils/database";

export interface SteamUserModel {
    readonly id: SteamId64;

    readonly username: string;

    readonly avatar?: string;

    readonly location?: string;

    readonly member_since?: Date;

    readonly first_seen_at?: Date;

    readonly last_seen_at?: Date;

    readonly times_seen: number;
}

const BASIC_WITH_TIMES_KEYS = [
    "id",
    "username",
    "avatar",
    "location",
    "member_since",
    "first_seen_at",
    "last_seen_at",
    "times_seen",
] as const satisfies (keyof SteamUserModel)[];

function formatBasicWithTimes(
    row: Pick<SteamUserModel, (typeof BASIC_WITH_TIMES_KEYS)[number]>,
): SteamUserWithTimes {
    let analytics: SteamUserAnalytics | null;

    if (row.first_seen_at && row.last_seen_at) {
        analytics = {
            firstSeenAt: row.first_seen_at.toISOString(),
            lastSeenAt: row.last_seen_at.toISOString(),
            timesSeen: row.times_seen,
        };
    } else {
        analytics = null;
    }

    return {
        id: row.id,
        username: row.username,
        avatar: row.avatar ?? null,
        location: row.location ?? null,
        memberSince: row.member_since?.toISOString() ?? null,
        analytics,
    };
}

class SteamUsersDatabase extends Database<SteamUserModel, "id", "steam_users"> {
    public constructor() {
        super("steam_users", "id", {
            id: { type: "TEXT", extra: ["PRIMARY KEY"] },
            username: { type: "TEXT" },
            avatar: { type: "TEXT", nullable: true },
            location: { type: "TEXT", nullable: true },
            member_since: { type: "TIMESTAMP", nullable: true },
            first_seen_at: { type: "TIMESTAMP", nullable: true },
            last_seen_at: { type: "TIMESTAMP", nullable: true },
            times_seen: { type: "INT" },
        });
    }

    public async addFromDiscordConnection(
        connection: DiscordSteamConnection,
        info: SteamUserInfo,
    ): Promise<SteamUserWithTimes> {
        const { id, username } = connection;
        const { avatar, location, memberSince: member_since } = info;

        const insertPayload: InsertPayloadFor<SteamUserModel, "id"> = {
            id,
            username,
            times_seen: 0,
        };

        const updatePayload: UpdatePayloadFor<SteamUserModel, "id"> = {
            username,
        };

        if (avatar) insertPayload.avatar = updatePayload.avatar = avatar;
        if (location) insertPayload.location = updatePayload.location = location;
        if (member_since) insertPayload.member_since = updatePayload.member_since = member_since;

        const upsertedUser = await this.upsert(insertPayload, updatePayload, BASIC_WITH_TIMES_KEYS);

        return formatBasicWithTimes(upsertedUser);
    }

    public async getSteamUsersDirect(
        ids: SteamId64[],
        timer: ServerTimer,
    ): Promise<SteamUserWithTimes[]> {
        using _ = timer.create("getSteamUsersDirect");

        const users = await this.selectMultiple(ids, BASIC_WITH_TIMES_KEYS);

        return users.map(formatBasicWithTimes);
    }
}

export const steamUsersDb = new SteamUsersDatabase();
