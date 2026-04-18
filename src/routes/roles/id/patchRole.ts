import { InsufficientLevelError } from "@/errors/ForbiddenError";
import { pg } from "@/global/pg";
import type { RoleModel } from "@/models/RoleModel";
import { getRoleLevel } from "@/services/getRoleLevel";
import type { DiscordId } from "@/shared/types/Common";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { ROLE_ID, ROLE_PAYLOAD, type RoleId, type RolePayload } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import type { ServerTimer } from "@/utils/serverTimer";
import { makeParams } from "@/utils/specUtils";
import { sql } from "bun";

export const patchRole: Endpoint<RolePayload, void, { id: RoleId }> = {
    method: "patch",
    path: "/roles/:id",
    auth: AuthScope.Permission,
    description: "Updates an existing role.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent | EndpointFlags.May404,
    requestBody: ROLE_PAYLOAD,
    responseBody: null,
    pathParams: makeParams({ id: ROLE_ID }),
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditRoles },
    async handleRequest({ req, timer, session, perms }) {
        const roleLevel = await getRoleLevel(req.params.id, timer);

        if (roleLevel >= perms.highestRoleLevel) {
            // this also prevents accidental privilege downgrading
            throw new InsufficientLevelError(roleLevel);
        }

        if (req.body.level >= perms.highestRoleLevel) {
            // no privilege escalation
            throw new InsufficientLevelError(req.body.level);
        }

        await updateRole(req.params.id, req.body, session.userId, timer);
    },
};

async function updateRole(
    roleId: RoleId,
    payload: RolePayload,
    userId: DiscordId,
    timer: ServerTimer,
): Promise<void> {
    using _ = timer.create("updateRole");

    const { name, icon, category, level, permissions } = payload;

    const { generalPermissions, userPermissions } = permissions;

    const update: Partial<RoleModel> = {
        name,
        icon,
        category,
        level,
        p_general: generalPermissions,
        p_user: userPermissions,
        last_updated_by: userId,
    };

    await pg`UPDATE roles SET ${sql(update)} WHERE id = ${roleId}`;
}
