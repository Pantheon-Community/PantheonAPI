import { pg } from "@/global/pg";
import { type RoleLevel } from "@/shared/types/Common";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { UserPermissions } from "@/shared/types/Permissions/UserPermissions";
import { ALL_GENERAL_PERMISSIONS, ALL_USER_PERMISSIONS } from "@/shared/utils/PermissionHelpers";

export interface RoleModel {
    readonly id: string;

    readonly name: string;

    readonly icon: string;

    readonly category: string;

    readonly level: RoleLevel;

    readonly p_general: GeneralPermissions;

    readonly p_user: UserPermissions;
}

export async function createRolesTable(): Promise<void> {
    await pg`
        CREATE TABLE IF NOT EXISTS roles (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            name VARCHAR(128) NOT NULL,
            icon VARCHAR(64),
            category VARCHAR(128),
            level SMALLINT NOT NULL,
            p_general INT NOT NULL,
            p_user INT NOT NULL
        )
    `;

    await pg`
        INSERT INTO roles (id, name, level, p_general, p_user)
        OVERRIDING SYSTEM VALUE
        VALUES (${0}, 'Root', 32767, ${ALL_GENERAL_PERMISSIONS}, ${ALL_USER_PERMISSIONS})
        ON CONFLICT (id) DO UPDATE SET
            p_general = ${ALL_GENERAL_PERMISSIONS},
            p_user = ${ALL_USER_PERMISSIONS}
    `;
}
