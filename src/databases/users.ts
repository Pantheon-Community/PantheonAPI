import { NotFoundError } from "@/errors/NotFoundError";
import { config } from "@/global/config";
import { pg } from "@/global/pg";
import type { DiscordId, Ip, Origin, UserAgent } from "@/shared/types/Common";
import type { WithPagination } from "@/shared/types/Pagination";
import type { GetMeUser } from "@/shared/types/Responses/GetMeResponse";
import type { SteamId64, SteamUserWithTimes } from "@/shared/types/SteamUser";
import type { UserFromSteam } from "@/shared/types/UserFromSteam";
import type { DiscordUser } from "@/types/Discord";
import type { SearchedUser } from "@/types/Internal";
import type { RequestAnalytics } from "@/types/RequestAnalytics";
import type { ServerTimer } from "@/utils/serverTimer";
import { SQL, sql } from "bun";
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

    readonly balance: number;

    readonly lifetime_balance: number;

    readonly lifetime_purchase_count: number;
}

interface SearchUserArgs {
    readonly page: number;

    readonly perPage: number;

    readonly usernameSearch: string | null;

    readonly ipSearch: string | null;

    readonly orderBy: "id" | "username" | "firstSeenAt" | "lastSeenAt" | "lifetimeActionCount";

    readonly order: "asc" | "desc";

    readonly timer: ServerTimer;
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
        super(
            "users",
            "id",
            {
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
                balance: { type: "INT" },
                lifetime_balance: { type: "INT" },
                lifetime_purchase_count: { type: "INT" },
            },
            {
                indexes: [
                    "username",
                    "first_seen_at",
                    "last_seen_at",
                    "lifetime_action_count",
                    "balance",
                    "lifetime_balance",
                    "lifetime_purchase_count",
                ],
            },
        );
    }

    public override async setup(): Promise<void> {
        await Promise.all([
            pg`ALTER TABLE ${this.tableName} ADD COLUMN IF NOT EXISTS balance INT NOT NULL DEFAULT 0`,
            pg`ALTER TABLE ${this.tableName} ADD COLUMN IF NOT EXISTS lifetime_balance INT NOT NULL DEFAULT 0`,
            pg`ALTER TABLE ${this.tableName} ADD COLUMN IF NOT EXISTS lifetime_purchase_count INT NOT NULL DEFAULT 0`,
        ]);

        await super.setup();

        const seedUser: InsertPayloadFor<UserModel, "id"> = {
            id: config.db.rootUserId,
            username: "Root User",
            first_seen_at: new Date(),
            last_seen_at: new Date(),
            lifetime_action_count: 0,
            balance: 0,
            lifetime_balance: 0,
            lifetime_purchase_count: 0,
        };

        await pg`
            INSERT INTO ${this.tableName} ${sql(seedUser)}
            ON CONFLICT (id) DO NOTHING
        `;
    }

    //#region Basic

    public async addOrUpdateUser(
        discordUser: DiscordUser,
        steamUsers: SteamUserWithTimes[],
        analytics: RequestAnalytics,
        timer: ServerTimer,
    ): Promise<GetMeUser> {
        using _ = timer.create("addOrUpdateUser");

        const { id, username: fallbackUsername, global_name, avatar } = discordUser;
        const { ip, userAgent, origin } = analytics;

        const username = global_name ?? fallbackUsername;

        const firstSteamId = steamUsers[0]?.id;

        const insertPayload: InsertPayloadFor<UserModel, "id"> = {
            id,
            username,
            first_seen_at: new Date(),
            last_seen_at: new Date(),
            lifetime_action_count: 0,
            balance: 0,
            lifetime_balance: 0,
            lifetime_purchase_count: 0,
        };

        const updatePayload: UpdatePayloadFor<UserModel, "id"> = {
            username,
            last_seen_at: new Date(),
        };

        if (avatar) insertPayload.avatar = updatePayload.avatar = avatar;
        if (firstSteamId) insertPayload.steam_id = firstSteamId; // only inserted
        if (ip) insertPayload.ip = updatePayload.ip = ip;
        if (userAgent) insertPayload.user_agent = updatePayload.user_agent = userAgent;
        if (origin) insertPayload.origin = updatePayload.origin = origin;

        const upsertedUser = await this.upsert(insertPayload, updatePayload, [
            "steam_id",
            "balance",
            "lifetime_balance",
            "lifetime_purchase_count",
        ]);

        // the below .find() can return null if the user removed the primary steam connection from
        // their account, however this edge case is ultimately more effort than it's worth to
        // routinely check
        const steam = upsertedUser.steam_id
            ? (steamUsers.find((x) => x.id === upsertedUser.steam_id) ?? null)
            : null;

        return {
            id,
            username,
            avatar,
            steam,
            balance: upsertedUser.balance,
            lifetimeBalance: upsertedUser.lifetime_balance,
            lifetimePurchaseCount: upsertedUser.lifetime_purchase_count,
        };
    }

    public async getUser(id: DiscordId, timer: ServerTimer): Promise<SearchedUser> {
        using _ = timer.create("getUser");

        const user = await this.select(id, [
            "username",
            "avatar",
            "steam_id",
            "first_seen_at",
            "last_seen_at",
            "lifetime_action_count",
            "ip",
            "user_agent",
            "origin",
        ]);

        if (user === undefined) {
            throw new UserNotFoundError();
        }

        return {
            id,
            username: user.username,
            avatar: user.avatar ?? null,
            steamId: user.steam_id ?? null,
            firstSeenAt: user.first_seen_at.toISOString(),
            lastSeenAt: user.last_seen_at.toISOString(),
            lifetimeActionCount: user.lifetime_action_count,
            ip: user.ip ?? null,
            userAgent: user.user_agent ?? null,
            origin: user.origin ?? null,
        };
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

    public async searchUsers(args: SearchUserArgs): Promise<WithPagination<SearchedUser>> {
        const { page, perPage, usernameSearch, ipSearch, orderBy, order, timer } = args;

        using _ = timer.create("searchUsers");

        let where: SQL.Query<UserModel>;

        if (usernameSearch && ipSearch) {
            where = sql`
                WHERE username ILIKE ${`%${usernameSearch}%`}
                AND ip ILIKE ${`%${ipSearch}%`}
            `;
        } else if (usernameSearch) {
            where = sql`WHERE username ILIKE ${`%${usernameSearch}%`}`;
        } else if (ipSearch) {
            where = sql`WHERE ip ILIKE ${`%${ipSearch}%`}`;
        } else {
            where = sql``;
        }

        let finalOrderBy: keyof UserModel;

        switch (orderBy) {
            case "id":
            case "username":
                finalOrderBy = orderBy;
                break;

            case "firstSeenAt":
                finalOrderBy = "first_seen_at";
                break;

            case "lastSeenAt":
                finalOrderBy = "last_seen_at";
                break;

            case "lifetimeActionCount":
                finalOrderBy = "lifetime_action_count";
                break;
        }

        const { items, totalItemCount } = await this.search(
            where,
            [
                "id",
                "username",
                "avatar",
                "steam_id",
                "first_seen_at",
                "last_seen_at",
                "lifetime_action_count",
                "ip",
                "user_agent",
                "origin",
            ],
            page,
            perPage,
            finalOrderBy,
            order,
        );

        return {
            items: items.map<SearchedUser>((x) => ({
                id: x.id,
                username: x.username,
                avatar: x.avatar ?? null,
                steamId: x.steam_id ?? null,
                firstSeenAt: x.first_seen_at.toISOString(),
                lastSeenAt: x.last_seen_at.toISOString(),
                lifetimeActionCount: x.lifetime_action_count,
                ip: x.ip ?? null,
                userAgent: x.user_agent ?? null,
                origin: x.origin ?? null,
            })),
            totalItemCount,
        };
    }

    //#endregion
}

export const usersDb = new UsersDatabase();
