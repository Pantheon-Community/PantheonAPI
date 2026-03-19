import type { DiscordId } from "@/shared/types/Common";
import type { RoleBasic } from "@/shared/types/Role";
import { flattenPermissions, type FlattenedPermissions } from "@/shared/utils/PermissionHelpers";
import type { ServerTimer } from "@/utils/serverTimer";
import { sql } from "bun";
import { rolesDb } from "../roles";
import { userRolesDb } from "../userRoles";
import { Database } from "../utils/database";

export async function getUserRoleInfo(
    userId: DiscordId,
    timer: ServerTimer,
): Promise<FlattenedPermissions> {
    using _ = timer.create("getUserRoleInfo");

    const roles = await Database.join(
        {
            from: rolesDb,
            select: ["level", "p_general", "p_user"],
        },
        {
            from: userRolesDb,
            select: [],
        },
        {
            joinOn: sql`user_roles.user_id = ${userId}`,
            where: sql`roles.id = user_roles.role_id`,
        },
    );

    return flattenPermissions(
        ...roles.map<RoleBasic>((x) => ({
            level: x.roles_level,
            permissions: {
                generalPermissions: x.roles_p_general,
                userPermissions: x.roles_p_user,
            },
        })),
    );
}
