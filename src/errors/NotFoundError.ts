import type { OAS } from "@/shared/global/OAS";
import { SITE_ERROR_OBJECT } from "@/shared/types/SiteErrorObject";
import { SiteError } from "./SiteError";

/**
 * Error thrown when a resource does not exist in the relevant database.
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/404 MDN Reference}
 */
export class NotFoundError extends SiteError {
    protected override statusCode = 404; // not found
}

export const NOT_FOUND_ERROR = {
    description:
        "Error thrown when a resource does not exist in the relevant database.\n\n[MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/404)",
    content: { "application/json": { schema: SITE_ERROR_OBJECT } },
} as const satisfies OAS.Response;
