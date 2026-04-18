import { config } from "@/global/config";
import { pgUnsafe } from "@/global/pg";
import type { RoleModel } from "./RoleModel";
import type { UserModel } from "./UserModel";

export interface UserRoleModel {
    user_id: UserModel["id"];

    role_id: RoleModel["id"];
}

export async function createUserRolesTable(): Promise<void> {
    await pgUnsafe(`
        CREATE TABLE IF NOT EXISTS user_roles (
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, role_id)
        );

        CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles (user_id);
        CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles (role_id);

        INSERT INTO user_roles (user_id, role_id)
        VALUES ('${config.db.rootUserId}', 0)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    `);
}
