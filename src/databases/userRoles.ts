import { config } from "@/global/config";
import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";
import type { RoleId } from "@/shared/types/Role";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { sql } from "bun";
import { rolesDb, type RoleModel } from "./roles";
import { usersDb, type UserModel } from "./users";
import { Column } from "./utils/column";
import { Database, type ExternalReference, type InsertPayloadFor } from "./utils/database";

export interface UserRoleModel {
    readonly role_id: RoleModel["id"];

    readonly user_id: UserModel["id"];
}

class UserRolesDb extends Database<UserRoleModel, "role_id", "user_roles"> {
    public constructor() {
        super(
            "user_roles",
            "role_id",
            {
                role_id: {
                    type: "BIGINT",
                    references: {
                        db: rolesDb,
                        key: "id",
                        onDelete: "CASCADE",
                    } satisfies ExternalReference<RoleModel>,
                },
                user_id: {
                    type: Column.Snowflake,
                    references: {
                        db: usersDb,
                        key: "id",
                        onDelete: "CASCADE",
                    } satisfies ExternalReference<UserModel>,
                },
            },
            { constraints: [`PRIMARY KEY (role_id, user_id)`] },
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
            ON CONFLICT (role_id, user_id) DO NOTHING
        `;
    }

    public async getUserRoleIds(userId: DiscordId, timer: ServerTimer): Promise<RoleId[]> {
        using _ = timer.create("getUserRoleIds");

        const userRoles = await this.selectWhere(sql`user_id = ${userId}`, ["role_id"]);

        return userRoles.map((x) => castNumber(x.role_id));
    }
}

export const userRolesDb = new UserRolesDb();
