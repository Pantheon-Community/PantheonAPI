import { NotFoundError } from "@/errors/NotFoundError";
import { config } from "@/global/config";
import { pg } from "@/global/pg";
import type { DiscordId, Ip, Origin, SteamId64, UserAgent } from "@/shared/types/Common";
import type { UserBasic } from "@/shared/types/User";
import type { UserFromSteam } from "@/shared/types/UserFromSteam";
import type { DiscordUser } from "@/types/Discord";
import type { RequestAnalytics } from "@/types/RequestAnalytics";
import type { ServerTimer } from "@/utils/serverTimer";
import { sql } from "bun";
import { steamUsersDb, type SteamUserModel } from "./steamUsers";
import { Column } from "./utils/column";
import {
    Database,
    type ExternalReference,
    type InsertPayloadFor,
    type UpdatePayloadFor,
} from "./utils/database";

export interface UserModel {
    readonly id: DiscordId;

    readonly username: string;

    readonly avatar?: string;

    readonly steam_id?: SteamUserModel["id"];

    readonly first_seen_at: Date;

    readonly last_seen_at: Date;

    readonly lifetime_action_count: number;

    readonly ip?: Ip;

    readonly user_agent?: UserAgent;

    readonly origin?: Origin;
}

interface AddOrUpdateUserResult {
    readonly upsertedUser: UserBasic;

    readonly steamId: SteamId64 | null;
}

class UserNotFoundError extends NotFoundError {
    public constructor() {
        super({
            title: "User Not Found",
            description:
                "A user with this ID does not exist in the database. They may have been deleted.",
        });
    }
}

class UsersDatabase extends Database<UserModel, "id", "users"> {
    public constructor() {
        super("users", "id", {
            id: { type: Column.Snowflake, extra: ["PRIMARY KEY"] },
            username: { type: "VARCHAR(32)" },
            avatar: { type: "VARCHAR(32)", nullable: true },
            steam_id: {
                type: Column.SteamId64,
                nullable: true,
                references: {
                    db: steamUsersDb,
                    key: "id",
                    onDelete: "SET NULL",
                } satisfies ExternalReference<SteamUserModel>,
            },
            first_seen_at: { type: "TIMESTAMP" },
            last_seen_at: { type: "TIMESTAMP" },
            lifetime_action_count: { type: "INT" },
            ip: { type: Column.Ip, nullable: true },
            user_agent: { type: Column.UserAgent, nullable: true },
            origin: { type: Column.OriginUrl, nullable: true },
        });
    }

    public override async setup(): Promise<void> {
        await super.setup();

        const seedUser: InsertPayloadFor<UserModel, "id"> = {
            id: config.db.rootUserId,
            username: "Root User",
            first_seen_at: new Date(),
            last_seen_at: new Date(),
            lifetime_action_count: 0,
        };

        await pg`
            INSERT INTO ${this.tableName} ${sql(seedUser)}
            ON CONFLICT (id) DO NOTHING
        `;
    }

    //#region Basic

    public async addOrUpdateUser(
        discordUser: DiscordUser,
        steamId: SteamId64 | undefined,
        analytics: RequestAnalytics,
        timer: ServerTimer,
    ): Promise<AddOrUpdateUserResult> {
        using _ = timer.create("addOrUpdateUser");

        const { id, username: fallbackUsername, global_name, avatar } = discordUser;
        const { ip, userAgent, origin } = analytics;

        const username = global_name ?? fallbackUsername;

        const insertPayload: InsertPayloadFor<UserModel, "id"> = {
            id,
            username,
            first_seen_at: new Date(),
            last_seen_at: new Date(),
            lifetime_action_count: 0,
        };

        const updatePayload: UpdatePayloadFor<UserModel, "id"> = {
            username,
            last_seen_at: new Date(),
        };

        if (avatar) insertPayload.avatar = updatePayload.avatar = avatar;
        if (steamId) insertPayload.steam_id = steamId; // only inserted
        if (ip) insertPayload.ip = updatePayload.ip = ip;
        if (userAgent) insertPayload.user_agent = updatePayload.user_agent = userAgent;
        if (origin) insertPayload.origin = updatePayload.origin = origin;

        const upsertedUser = await this.upsert(insertPayload, updatePayload, ["steam_id"]);

        return { upsertedUser: { id, username, avatar }, steamId: upsertedUser.steam_id ?? null };
    }

    //#endregion

    //#region Other

    public async setUserSteam(
        id: DiscordId,
        steam: SteamId64 | null,
        timer: ServerTimer,
    ): Promise<void> {
        using _ = timer.create("setUserSteam");

        const updatedUserId = await this.update(id, { steam_id: steam });

        if (updatedUserId === null) {
            throw new UserNotFoundError();
        }
    }

    public async updateUserAnalytics(id: DiscordId, analytics: RequestAnalytics): Promise<void> {
        const { ip, userAgent, origin } = analytics;

        const updatePayload: UpdatePayloadFor<UserModel, "id"> = {
            last_seen_at: new Date(),
        };

        if (ip) updatePayload.ip = ip;
        if (userAgent) updatePayload.user_agent = userAgent;
        if (origin) updatePayload.origin = origin;

        const updatedUserId = await this.updateExtra(
            id,
            updatePayload,
            sql`lifetime_action_count = lifetime_action_count + 1`,
        );

        if (updatedUserId === undefined) {
            throw new UserNotFoundError();
        }
    }

    public async getUsersFromSteam(
        steamIds: SteamId64[],
        timer: ServerTimer,
    ): Promise<UserFromSteam[]> {
        using _ = timer.create("getUsersFromSteam");

        const users = await this.selectWhere(sql`steam_id = ANY(${sql.array(steamIds, "TEXT")})`, [
            "steam_id",
            "id",
            "username",
            "avatar",
        ]);

        return users.map<UserFromSteam>((x) => ({
            steamId: x.steam_id!,
            discordId: x.id,
            discordUsername: x.username,
            discordAvatar: x.avatar ?? null,
        }));
    }

    //#endregion
}

export const usersDb = new UsersDatabase();
