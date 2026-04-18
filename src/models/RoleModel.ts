import { pgUnsafe } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";
import {
    ALL_GENERAL_PERMISSIONS,
    GeneralPermissions,
} from "@/shared/types/Permissions/GeneralPermissions";
import { ALL_USER_PERMISSIONS, UserPermissions } from "@/shared/types/Permissions/UserPermissions";
import type { RoleLevel } from "@/shared/types/Role";

export interface RoleModel {
    id: string;

    name: string;

    icon: string;

    category: string;

    level: RoleLevel;

    p_general: GeneralPermissions;

    p_user: UserPermissions;

    created_by: DiscordId | null;

    created_at: Date;

    last_updated_by: DiscordId | null;

    last_updated_at: Date;
}

export async function createRolesTable(): Promise<void> {
    await pgUnsafe(`
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            name TEXT NOT NULL,
            icon TEXT NOT NULL DEFAULT '',
            category TEXT NOT NULL DEFAULT '',
            level INTEGER NOT NULL DEFAULT 0,
            p_general INTEGER NOT NULL DEFAULT ${GeneralPermissions.None},
            p_user INTEGER NOT NULL DEFAULT ${UserPermissions.None},
            created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            last_updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
            last_updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        INSERT INTO roles (id, name, level, p_general, p_user)
        OVERRIDING SYSTEM VALUE
        VALUES (0, 'Root', 32767, ${ALL_GENERAL_PERMISSIONS}, ${ALL_USER_PERMISSIONS})
        ON CONFLICT (id) DO UPDATE SET
            p_general = ${ALL_GENERAL_PERMISSIONS},
            p_user = ${ALL_USER_PERMISSIONS},
            last_updated_at = NOW();
    `);
}
