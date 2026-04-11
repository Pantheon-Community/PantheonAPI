import { InsufficientLevelError } from "@/errors/ForbiddenError";
import { pg } from "@/global/pg";
import { type RoleModel } from "@/models/RoleModel";
import type { DiscordId } from "@/shared/types/Common";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { ROLE_ID, ROLE_PAYLOAD, type RoleId, type RolePayload } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

export const postRoles: Endpoint<RolePayload, RoleId> = {
    method: "post",
    path: "/roles",
    auth: AuthScope.Permission,
    description: "Creates a new role.",
    returns: "The ID of the created role.",
    tags: ["Roles"],
    requestBody: ROLE_PAYLOAD,
    responseBody: ROLE_ID,
    pathParams: null,
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditRoles },
    async handleRequest({ req, timer, session, perms }) {
        if (req.body.level >= perms.highestRoleLevel) {
            // cannot create roles of same or higher level
            throw new InsufficientLevelError(req.body.level);
        }

        return await createRole(req.body, session.userId, timer);
    },
};

async function createRole(
    payload: RolePayload,
    userId: DiscordId,
    timer: ServerTimer,
): Promise<RoleId> {
    using _ = timer.create("createRole");

    const { name, icon, category, level, permissions } = payload;

    const { generalPermissions, userPermissions } = permissions;

    const insert: Partial<RoleModel> = {
        name,
        icon,
        category,
        level,
        p_general: generalPermissions,
        p_user: userPermissions,
        created_by: userId,
        last_updated_by: userId,
    };

    try {
        const [role] = await pg<[Pick<RoleModel, "id">]>`
            INSERT INTO roles ${sql(insert)}
            RETURNING id
        `;

        return castNumber(role.id);
    } catch (error) {
        throw wrapPgError(error);
    }
}
