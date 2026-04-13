import { InsufficientLevelError } from "@/errors/ForbiddenError";
import { pg } from "@/global/pg";
import { getRoleLevel } from "@/services/getRoleLevel";
import { DISCORD_ID, type DiscordId } from "@/shared/types/Common";
import { UserPermissions } from "@/shared/types/Permissions/UserPermissions";
import { ROLE_ID, type RoleId } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";

export const deleteUserRole: Endpoint<void, void, { userId: DiscordId; roleId: RoleId }> = {
    method: "delete",
    path: "/users/:userId/roles/:roleId",
    auth: AuthScope.Permission,
    description: "Removes a role from a user.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent | EndpointFlags.May404,
    requestBody: null,
    responseBody: null,
    pathParams: makeParams({ userId: DISCORD_ID, roleId: ROLE_ID }),
    queryParams: null,
    permissions: { userPermissions: UserPermissions.ManageRoles },
    async handleRequest({ req, timer, perms }) {
        const { roleId, userId } = req.params;

        const roleLevel = await getRoleLevel(roleId, timer);

        if (roleLevel >= perms.highestRoleLevel) {
            throw new InsufficientLevelError(roleLevel);
        }

        using _ = timer.create("removeUserRole");

        try {
            await pg`
                DELETE FROM user_roles
                WHERE user_id = ${userId} AND role_id = ${roleId}
            `;
        } catch (error) {
            throw wrapPgError(error);
        }
    },
};
