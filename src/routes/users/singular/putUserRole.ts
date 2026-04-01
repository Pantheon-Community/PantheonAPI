import { rolesDb } from "@/databases/roles";
import { userRolesDb } from "@/databases/userRoles";
import { InsufficientLevelError } from "@/errors/ForbiddenError";
import type { DiscordId } from "@/shared/types/Common";
import { UserPermissions } from "@/shared/types/Permissions/UserPermissions";
import type { RoleId } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Gives a user a role. */
export const putUserRole: Endpoint<void, void, { userId: DiscordId; roleId: RoleId }> = {
    method: "put",
    path: "/users/:userId/roles/:roleId",
    auth: AuthScope.Permission,
    permissions: { userPermissions: UserPermissions.ManageRoles },
    async handleRequest({ req, timer, perms }) {
        const roleToGive = await rolesDb.getRole(req.params.roleId, timer);

        if (roleToGive.level >= perms.highestRoleLevel) {
            throw new InsufficientLevelError(roleToGive.level);
        }

        await userRolesDb.addUserRole(req.params.userId, req.params.roleId, timer);
    },
};
