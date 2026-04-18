import { InsufficientLevelError } from "@/errors/ForbiddenError";
import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import { getRoleLevel } from "@/services/getRoleLevel";
import { DISCORD_ID, type DiscordId } from "@/shared/types/Common";
import { UserPermissions } from "@/shared/types/Permissions/UserPermissions";
import { ROLE_ID, type RoleId } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";

export const putUserRole: Endpoint<void, void, { userId: DiscordId; roleId: RoleId }> = {
    method: "put",
    path: "/users/:userId/roles/:roleId",
    auth: AuthScope.Permission,
    description: "Gives a user a role.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent | EndpointFlags.May404,
    tag: "roles",
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

        using _ = timer.create("addUserRole");

        const insertedRow = await pg<[]>`
                INSERT INTO user_roles (user_id, role_id)
                SELECT ${userId}, ${roleId}
                WHERE EXISTS (SELECT 1 FROM users WHERE id = ${userId})
                AND EXISTS (SELECT 1 FROM roles WHERE id = ${roleId})
                ON CONFLICT (user_id, role_id) DO NOTHING
                RETURNING 1
            `;

        if (insertedRow.length === 0) {
            throw new NotFoundError({
                title: "User Not Found",
                description: "A user with this ID does not exist in the database.",
            });
        }
    },
};
