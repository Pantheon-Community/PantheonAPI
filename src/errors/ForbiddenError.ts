import type { PermissionsObject } from "@/shared/types/Permissions/PermissionsObject";
import type { RoleLevel } from "@/shared/types/Role";
import type { SiteErrorObject } from "@/shared/types/SiteErrorObject";
import { SiteError } from "./SiteError";

interface ForbiddenErrorObject extends SiteErrorObject {
    requiredPermissions?: Partial<PermissionsObject>;

    minimumLevel?: RoleLevel;
}

/**
 * Error thrown when a request is made with insufficient permissions, or to do something that is
 * not allowed no matter the permissions.
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403 MDN Reference}
 */
export class ForbiddenError extends SiteError<ForbiddenErrorObject> {
    protected override statusCode = 403; // forbidden
}

export class MissingPermissionError extends ForbiddenError {
    public constructor(requiredPermissions: Partial<PermissionsObject>) {
        super({
            title: "Missing Permissions",
            description: "You do not have the required permissions to do this action.",
            requiredPermissions,
        });
    }
}

export class InsufficientLevelError extends ForbiddenError {
    public constructor(level: RoleLevel) {
        super({
            title: "Insufficient Permission Level",
            description: "Your highest permission level is not sufficient to do this action.",
            minimumLevel: (level + 1) as RoleLevel,
        });
    }
}
