import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import type { UserPermissions } from "@/shared/types/Permissions/UserPermissions";
import type { Role, RoleId, RoleInput, RoleLevel } from "@/shared/types/Role";
import { ALL_GENERAL_PERMISSIONS, ALL_USER_PERMISSIONS } from "@/shared/utils/PermissionHelpers";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { Database, type InsertPayloadFor, type UpdatePayloadFor } from "./utils/database";

export interface RoleModel {
    readonly id: string;

    readonly name: string;

    readonly icon?: string;

    readonly category?: string;

    readonly level: RoleLevel;

    readonly p_general: GeneralPermissions;

    readonly p_user: UserPermissions;
}

const WITHOUT_ID_KEYS = [
    "name",
    "icon",
    "category",
    "level",
    "p_general",
    "p_user",
] as const satisfies (keyof RoleModel)[];

const ALL_KEYS = ["id", ...WITHOUT_ID_KEYS] as const satisfies (keyof RoleModel)[];

function formatWithoutId(id: RoleId, row: Pick<RoleModel, (typeof WITHOUT_ID_KEYS)[number]>): Role {
    return {
        id,
        name: row.name,
        icon: row.icon ?? null,
        category: row.category ?? null,
        level: row.level,
        permissions: { generalPermissions: row.p_general, userPermissions: row.p_user },
    };
}

function formatFull(row: Pick<RoleModel, (typeof ALL_KEYS)[number]>): Role {
    return formatWithoutId(castNumber(row.id), row);
}

class RoleNotFoundError extends NotFoundError {
    public constructor() {
        super({
            title: "Role Not Found",
            description:
                "A role with this ID does not exist in the database. It may have been deleted.",
        });
    }
}

class RolesDatabase extends Database<RoleModel, "id", "roles"> {
    public constructor() {
        super("roles", "id", {
            id: { type: "BIGINT GENERATED ALWAYS AS IDENTITY", extra: ["PRIMARY KEY"] },
            name: { type: "TEXT" },
            icon: { type: "TEXT", nullable: true },
            category: { type: "TEXT", nullable: true },
            level: { type: "SMALLINT" },
            p_general: { type: "INT" },
            p_user: { type: "INT" },
        });
    }

    public override async setup(): Promise<void> {
        await super.setup();

        await pg`
            INSERT INTO ${this.tableName} (id, name, level, p_general, p_user)
            OVERRIDING SYSTEM VALUE
            VALUES (0, 'Root', 32767, ${ALL_GENERAL_PERMISSIONS}, ${ALL_USER_PERMISSIONS})
            ON CONFLICT (id) DO UPDATE SET
                p_general = ${ALL_GENERAL_PERMISSIONS},
                p_user = ${ALL_USER_PERMISSIONS}
        `;
    }

    //#region Basic

    public async createRole(input: RoleInput, timer: ServerTimer): Promise<RoleId> {
        using _ = timer.create("createRole");

        const insertPayload: InsertPayloadFor<RoleModel, "id"> = {
            name: input.name,
            level: input.level,
            p_general: input.permissions.generalPermissions,
            p_user: input.permissions.userPermissions,
        };

        if (input.icon) insertPayload.icon = input.icon;
        if (input.category) insertPayload.category = input.category;

        const insertedRoleId = await this.insert(insertPayload);

        return castNumber(insertedRoleId);
    }

    public async getRole(id: RoleId, timer: ServerTimer): Promise<Role> {
        using _ = timer.create("getRole");

        const role = await this.select(id.toString(), WITHOUT_ID_KEYS);

        if (role === undefined) {
            throw new RoleNotFoundError();
        }

        return formatWithoutId(id, role);
    }

    public async updateRole(id: RoleId, input: RoleInput, timer: ServerTimer): Promise<void> {
        using _ = timer.create("updateRole");

        const updatePayload: UpdatePayloadFor<RoleModel, "id"> = {
            name: input.name,
            icon: input.icon,
            category: input.category,
            level: input.level,
            p_general: input.permissions.generalPermissions,
            p_user: input.permissions.userPermissions,
        };

        const updatedRoleId = await this.update(id.toString(), updatePayload);

        if (updatedRoleId === undefined) {
            throw new RoleNotFoundError();
        }
    }

    public async deleteRole(id: RoleId, timer: ServerTimer): Promise<void> {
        using _ = timer.create("deleteRole");

        const wasDeleted = await this.delete(id.toString());

        if (!wasDeleted) {
            throw new RoleNotFoundError();
        }
    }

    //#endregion

    public async getAllRoles(timer: ServerTimer): Promise<Role[]> {
        using _ = timer.create("getAllRoles");

        const allRoles = await this.selectAll(ALL_KEYS);

        return allRoles.map(formatFull);
    }
}

export const rolesDb = new RolesDatabase();
