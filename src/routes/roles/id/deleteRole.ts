import { InsufficientLevelError } from "@/errors/ForbiddenError";
import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import { getRoleLevel } from "@/services/getRoleLevel";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { ROLE_ID, type RoleId, type RoleLevel } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";

export const deleteRole: Endpoint<void, void, { id: RoleId }> = {
    method: "delete",
    path: "/roles/:id",
    auth: AuthScope.Permission,
    description: "Deletes an existing role.",
    returns: "Success, no content.",
    tag: "Roles",
    flags: EndpointFlags.NoContent,
    requestBody: null,
    responseBody: null,
    pathParams: makeParams({ id: ROLE_ID }),
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditRoles },
    async handleRequest({ req, timer, perms }) {
        let roleLevel: RoleLevel;

        try {
            roleLevel = await getRoleLevel(req.params.id, timer);
        } catch (error) {
            // role was already deleted (or never existed in the first place), so task successful
            // as far as the user is concerned
            if (error instanceof NotFoundError) {
                return;
            }

            throw error;
        }

        if (roleLevel >= perms.highestRoleLevel) {
            throw new InsufficientLevelError(roleLevel);
        }

        using _ = timer.create("deleteRole");

        try {
            await pg`DELETE FROM roles WHERE id = ${req.params.id}`;
        } catch (error) {
            throw wrapPgError(error);
        }
    },
};
