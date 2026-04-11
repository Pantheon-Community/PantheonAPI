import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { RoleModel } from "@/models/RoleModel";
import type { RoleId, RoleLevel } from "@/shared/types/Role";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "@/utils/wrapPgError";

export async function getRoleLevel(roleId: RoleId, timer: ServerTimer): Promise<RoleLevel> {
    using _ = timer.create("getRoleLevel");

    try {
        const [role] = await pg<Pick<RoleModel, "level">[]>`
            SELECT level
            FROM roles
            WHERE id = ${roleId}
        `;

        if (role === undefined) {
            throw new NotFoundError({
                title: "Role Not Found",
                description:
                    "A role with this ID does not exist in the database, it may have been deleted.",
            });
        }

        return role.level;
    } catch (error) {
        throw wrapPgError(error);
    }
}
