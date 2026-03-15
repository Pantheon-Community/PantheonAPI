import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";
import type { RoleBasic } from "@/shared/types/Role";
import { flattenPermissions, type FlattenedPermissions } from "@/shared/utils/PermissionHelpers";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "../utils/handlePgError";
import type { RoleModel } from "./roleModel";

type SelectQuery = Pick<RoleModel, "level" | "p_general" | "p_user">;

export async function getUserRoleInfo(
    userId: DiscordId,
    timer: ServerTimer,
): Promise<FlattenedPermissions> {
    using _ = timer.create("getUserRoleInfo");

    try {
        const roles = await pg<SelectQuery[]>`
            SELECT
                roles.level,
                roles.p_general,
                roles.p_user
            FROM roles
            JOIN user_roles ON user_roles.user_id = ${userId}
            WHERE roles.id = user_roles.role_id
        `;

        return flattenPermissions(
            ...roles.map<RoleBasic>((x) => ({
                level: x.level,
                permissions: { generalPermissions: x.p_general, userPermissions: x.p_user },
            })),
        );
    } catch (error) {
        throw wrapPgError(error);
    }
}
