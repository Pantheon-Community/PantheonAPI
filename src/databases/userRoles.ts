import { config } from "@/global/config";
import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";
import type { RoleId } from "@/shared/types/Role";
import type { UserRole } from "@/types/Internal";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { sql } from "bun";
import { rolesDb, type RoleModel } from "./roles";
import { usersDb, type UserModel } from "./users";
import { Column } from "./utils/column";
import { Database, type ExternalReference, type InsertPayloadFor } from "./utils/database";
import { wrapPgError } from "./utils/handlePgError";

export interface UserRoleModel {
    readonly role_id: RoleModel["id"];

    readonly user_id: UserModel["id"];
}

class UserRolesDb extends Database<UserRoleModel, "user_id", "user_roles"> {
    public constructor() {
        super(
            "user_roles",
            "user_id",
            {
                user_id: {
                    type: Column.Snowflake,
                    references: {
                        db: usersDb,
                        key: "id",
                        onDelete: "CASCADE",
                    } satisfies ExternalReference<UserModel>,
                },
                role_id: {
                    type: "BIGINT",
                    references: {
                        db: rolesDb,
                        key: "id",
                        onDelete: "CASCADE",
                    } satisfies ExternalReference<RoleModel>,
                },
            },
            { constraints: [`PRIMARY KEY (user_id, role_id)`] },
        );
    }

    public override async setup(): Promise<void> {
        await super.setup();

        const seedUserRole: InsertPayloadFor<UserRoleModel, "role_id"> = {
            role_id: "0",
            user_id: config.db.rootUserId,
        };

        await pg`
            INSERT INTO ${this.tableName} ${sql(seedUserRole)}
            ON CONFLICT (user_id, role_id) DO NOTHING
        `;
    }

    public async getUserRoleIds(userId: DiscordId, timer: ServerTimer): Promise<RoleId[]> {
        using _ = timer.create("getUserRoleIds");

        const userRoles = await this.selectMultiple([userId], ["role_id"]);

        return userRoles.map((x) => castNumber(x.role_id));
    }

    public async getAllUserRoleIds(userIds: DiscordId[], timer: ServerTimer): Promise<UserRole[]> {
        using _ = timer.create("getAllUserRoleIds");

        const userRoles = await this.selectMultiple(userIds, ["user_id", "role_id"]);

        return userRoles.map((x) => ({ userId: x.user_id, roleId: castNumber(x.role_id) }));
    }

    public async addUserRole(userId: DiscordId, roleId: RoleId, timer: ServerTimer): Promise<void> {
        using _ = timer.create("addUserRole");

        try {
            await pg`
                INSERT INTO ${this.tableName} (user_id, role_id)
                VALUES (${userId}, ${roleId})
                ON CONFLICT (user_id, role_id) DO NOTHING
            `;
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    public async removeUserRole(
        userId: DiscordId,
        roleId: RoleId,
        timer: ServerTimer,
    ): Promise<void> {
        using _ = timer.create("removeUserRole");

        await this.deleteWhere(sql`user_id = ${userId} AND role_id = ${roleId}`);
    }
}

export const userRolesDb = new UserRolesDb();
