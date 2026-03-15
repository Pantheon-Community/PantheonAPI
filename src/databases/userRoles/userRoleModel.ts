import { pg } from "@/global/pg";
import type { RoleModel } from "../roles/roleModel";
import type { UserModel } from "../users/userModel";
import { Column } from "../utils/column";

export interface UserRoleModel {
    readonly role_id: RoleModel["id"];

    readonly user_id: UserModel["id"];
}

export async function createUserRolesTable(): Promise<void> {
    await pg.unsafe(`
        CREATE TABLE IF NOT EXISTS user_roles (
            role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
            user_id ${Column.Snowflake} REFERENCES users(id) ON DELETE CASCADE,
            PRIMARY KEY (role_id, user_id)
        )
    `);
}
