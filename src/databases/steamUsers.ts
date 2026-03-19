import type { SteamId64 } from "@/shared/types/Common";
import type { SteamUserBasicWithTimes } from "@/shared/types/SteamUser";
import type { DiscordSteamConnection } from "@/types/Discord";
import type { SteamUserInfo } from "@/types/SteamUserInfo";
import { Column } from "./utils/column";
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
] as const satisfies (keyof SteamUserModel)[];

function formatBasicWithTimes(
    row: Pick<SteamUserModel, (typeof BASIC_WITH_TIMES_KEYS)[number]>,
): SteamUserBasicWithTimes {
    return {
        id: row.id,
        username: row.username,
        avatar: row.avatar ?? null,
        location: row.location ?? null,
        memberSince: row.member_since?.toISOString() ?? null,
        firstSeenAt: row.first_seen_at?.toISOString() ?? null,
        lastSeenAt: row.last_seen_at?.toISOString() ?? null,
    };
}

class SteamUsersDatabase extends Database<SteamUserModel, "id", "steam_users"> {
    public constructor() {
        super("steam_users", "id", {
            id: { type: Column.SteamId64, extra: ["PRIMARY KEY"] },
            username: { type: "VARCHAR(32)" },
            avatar: { type: "VARCHAR(128)", nullable: true },
            location: { type: "VARCHAR(32)", nullable: true },
            member_since: { type: "TIMESTAMP", nullable: true },
            first_seen_at: { type: "TIMESTAMP", nullable: true },
            last_seen_at: { type: "TIMESTAMP", nullable: true },
            times_seen: { type: "INT" },
        });
    }

    public async addFromDiscordConnection(
        connection: DiscordSteamConnection,
        info: SteamUserInfo,
    ): Promise<SteamUserBasicWithTimes> {
        const { id, username } = connection;
        const { avatar, location, memberSince: member_since } = info;

        const insertPayload: InsertPayloadFor<SteamUserModel, "id"> = {
            id,
            username,
            times_seen: 0,
        };

        const updatePayload: UpdatePayloadFor<SteamUserModel, "id"> = { username };

        if (avatar) insertPayload.avatar = updatePayload.avatar = avatar;
        if (location) insertPayload.location = updatePayload.location = location;
        if (member_since) insertPayload.member_since = updatePayload.member_since = member_since;

        const upsertedUser = await this.upsert(insertPayload, updatePayload, BASIC_WITH_TIMES_KEYS);

        return formatBasicWithTimes(upsertedUser);
    }
}

export const steamUsersDb = new SteamUsersDatabase();
