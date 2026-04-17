import { ForbiddenError } from "@/errors/ForbiddenError";
import { pg } from "@/global/pg";
import type { RoleModel } from "@/models/RoleModel";
import type { DiscordId, UserToken } from "@/shared/types/Common";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { UserPermissions } from "@/shared/types/Permissions/UserPermissions";
import type { RoleLevel } from "@/shared/types/Role";
import { type FlattenedPermissions, hasPermission } from "@/shared/utils/permissions";
import type { PermissionAuthEndpoint } from "@/types/Express/Endpoint";
import { getFingerprint } from "@/utils/getFingerprint";
import type { ServerTimer } from "@/utils/serverTimer";
import type { Request, Response } from "express";
import { getCurrentSession } from "../getCurrentSession";
import { getTokenRequired } from "../getToken";
import { registerBaseEndpoint } from "./registerBaseEndpoint";

export function registerPermissionAuthEndpoint(endpoint: PermissionAuthEndpoint): void {
    registerBaseEndpoint(endpoint, handler.bind(endpoint));
}

async function getPermissions(
    userId: DiscordId,
    timer: ServerTimer,
): Promise<FlattenedPermissions> {
    using _ = timer.create("getPermissions");

    const roles = await pg<Pick<RoleModel, "level" | "p_general" | "p_user">[]>`
            SELECT roles.level, roles.p_general, roles.p_user
            FROM roles
            JOIN user_roles
            ON roles.id = user_roles.role_id
            WHERE user_roles.user_id = ${userId}
        `;

    let highestLevel: number = Number.MIN_SAFE_INTEGER;

    let generalPermissions = GeneralPermissions.None;
    let userPermissions = UserPermissions.None;

    for (const { level, p_general, p_user } of roles) {
        highestLevel = Math.max(level, highestLevel);

        generalPermissions |= p_general;
        userPermissions |= p_user;
    }

    return {
        highestRoleLevel: highestLevel as RoleLevel,
        generalPermissions,
        userPermissions,
    };
}

async function handler(
    this: PermissionAuthEndpoint,
    req: Request,
    res: Response,
    timer: ServerTimer,
): Promise<unknown> {
    const token = getTokenRequired<UserToken>(req);

    const fingerprint = getFingerprint(req);

    const session = await getCurrentSession(token, fingerprint, timer);

    const perms = await getPermissions(session.userId, timer);

    if (!hasPermission(perms, this.permissions)) {
        throw new ForbiddenError({
            title: "Missing Permissions",
            description: "You do not have the required permissions to do this action.",
            requiredPermissions: this.permissions,
        });
    }

    return await this.handleRequest({ req, res, timer, fingerprint, session, perms });
}
