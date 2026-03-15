import { pg } from "@/global/pg";
import type { RoleId } from "@/shared/types/Common";
import type { RoleWithoutId } from "@/shared/types/Role";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "../utils/handlePgError";
import type { RoleModel } from "./roleModel";

type InsertQuery = Pick<RoleModel, "id">;

export async function createRole(payload: RoleWithoutId, timer: ServerTimer): Promise<RoleId> {
    using _ = timer.create("createRole");

    const { name, icon, category, level, permissions } = payload;
    const { generalPermissions, userPermissions } = permissions;

    try {
        const [createdRole] = await pg<[InsertQuery]>`
            INSERT INTO roles (name, icon, category, level, p_general, p_user)
            VALUES (
                ${name},
                ${icon},
                ${category},
                ${level},
                ${generalPermissions},
                ${userPermissions}
            )
            RETURNING id
        `;

        return castNumber(createdRole.id);
    } catch (error) {
        throw wrapPgError(error);
    }
}
