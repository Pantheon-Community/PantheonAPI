import type { OAS } from "@/shared/global/OAS";
import {
    PERMISSIONS_OBJECT,
    type PermissionsObject,
} from "@/shared/types/Permissions/PermissionsObject";
import { ROLE_LEVEL, type RoleLevel } from "@/shared/types/Role";
import { SITE_ERROR_OBJECT, type SiteErrorObject } from "@/shared/types/SiteErrorObject";
import { partial } from "@/shared/utils/specHelpers";
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
// oxlint-disable-next-line typescript/no-unnecessary-type-arguments WRONG
export class ForbiddenError extends SiteError<ForbiddenErrorObject> {
    protected override statusCode = 403; // forbidden
}

export const FORBIDDEN_ERROR = {
    description:
        "Error thrown when a request is made with insufficient permissions, or to do something that is not allowed no matter the permissions.\n\n[MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403)",
    content: {
        "application/json": {
            schema: {
                ...SITE_ERROR_OBJECT,
                example: {
                    title: "Missing Permissions",
                    description: "You do not have the required permissions to do this action.",
                },
                properties: {
                    ...SITE_ERROR_OBJECT.properties,
                    requiredPermissions: partial(PERMISSIONS_OBJECT).schema,
                    minimumLevel: ROLE_LEVEL.schema,
                },
            },
        },
    },
} as const satisfies OAS.Response;

export class InsufficientLevelError extends ForbiddenError {
    public constructor(level: RoleLevel) {
        super({
            title: "Insufficient Permission Level",
            description: "Your highest permission level is not sufficient to do this action.",
            minimumLevel: (level + 1) as RoleLevel,
        });
    }
}
