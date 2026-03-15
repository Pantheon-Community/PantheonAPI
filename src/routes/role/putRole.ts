import { createRole } from "@/databases/roles/createRole";
import { InsufficientLevelError } from "@/errors/ForbiddenError";
import type { RoleId } from "@/shared/types/Common";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import type { RoleWithoutId } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const putRole: Endpoint<RoleWithoutId, RoleId> = {
    method: "put",
    path: "/roles",
    auth: AuthScope.Permission,
    permissions: { generalPermissions: GeneralPermissions.EditRoles },
    async handleRequest({ req, timer, perms }) {
        if (req.body.level >= perms.highestRoleLevel) {
            throw new InsufficientLevelError(req.body.level);
        }

        return await createRole(req.body, timer);
    },
};
