import { rolesDb } from "@/databases/roles";
import { InsufficientLevelError } from "@/errors/ForbiddenError";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import type { RoleId, RoleWithoutId } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

interface PathParams {
    id: RoleId;
}

/** Updates an existing role. */
export const patchRole: Endpoint<RoleWithoutId, void, PathParams> = {
    method: "patch",
    path: "/roles/:id",
    auth: AuthScope.Permission,
    permissions: { generalPermissions: GeneralPermissions.EditRoles },
    async handleRequest({ req, timer, perms }) {
        const role = await rolesDb.getRole(req.params.id, timer);

        if (role.level >= perms.highestRoleLevel) {
            // can't edit roles of equal level, e.g. "admin" cannot edit the "admin" role
            // this also prevents accidental privilege downgrading
            throw new InsufficientLevelError(role.level);
        }

        if (req.body.level >= perms.highestRoleLevel) {
            // no privilege escalation either
            throw new InsufficientLevelError(req.body.level);
        }

        return await rolesDb.updateRole(req.params.id, req.body, timer);
    },
};
