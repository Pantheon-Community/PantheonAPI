import { rolesDb } from "@/databases/roles";
import { InsufficientLevelError } from "@/errors/ForbiddenError";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import type { RoleId } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

interface PathParams {
    id: RoleId;
}

/** Deletes an existing role. */
export const deleteRole: Endpoint<void, void, PathParams> = {
    method: "delete",
    path: "/roles/:id",
    auth: AuthScope.Permission,
    permissions: { generalPermissions: GeneralPermissions.EditRoles },
    async handleRequest({ req, timer, perms }) {
        const role = await rolesDb.getRole(req.params.id, timer);

        // same checks as updating

        if (role.level >= perms.highestRoleLevel) {
            throw new InsufficientLevelError(role.level);
        }

        await rolesDb.deleteRole(role.id, timer);
    },
};
