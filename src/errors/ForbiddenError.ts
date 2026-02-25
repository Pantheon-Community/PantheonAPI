import type { PermissionsObject } from "@/shared/types/Permissions/PermissionsObject";
import type { SiteErrorObject } from "@/shared/types/SiteErrorObject";
import { SiteError } from "./SiteError";

interface ForbiddenErrorObject extends SiteErrorObject {
	/** The relevant permissions that were missing, if applicable. */
	missingPermissions?: Partial<PermissionsObject>;
}

/**
 * Error thrown when a request is made with insufficient permissions, or to do something that is
 * not allowed no matter the permissions.
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403 MDN Reference}
 */
abstract class ForbiddenError extends SiteError<ForbiddenErrorObject> {
	protected override statusCode = 403; // Forbidden
}

export class MissingPermissionError extends ForbiddenError {
	public constructor(missingPermissions: Partial<PermissionsObject>) {
		super({
			title: "Missing Permissions",
			description: "You do not have the required permissions to do this action.",
			missingPermissions,
		});
	}
}

export class NeverAllowedError extends ForbiddenError {
	public constructor() {
		super({
			title: "Not Allowed",
			description: "This action cannot be done, regardless of permissions.",
		});
	}
}
