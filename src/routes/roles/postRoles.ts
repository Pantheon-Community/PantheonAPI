import { rolesDb } from "@/databases/roles";
import { InsufficientLevelError } from "@/errors/ForbiddenError";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import type { RoleId, RoleInput } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Creates a new role. */
export const postRoles: Endpoint<RoleInput, RoleId> = {
    method: "post",
    path: "/roles",
    auth: AuthScope.Permission,
    permissions: { generalPermissions: GeneralPermissions.EditRoles },
    async handleRequest({ req, timer, perms }) {
        if (req.body.level >= perms.highestRoleLevel) {
            // cannot create roles of same or higher level
            throw new InsufficientLevelError(req.body.level);
        }

        return await rolesDb.createRole(req.body, timer);
    },
};
