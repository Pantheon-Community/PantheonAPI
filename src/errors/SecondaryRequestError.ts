import type { OAS } from "@/shared/global/OAS.js";
import { SITE_ERROR_OBJECT, type SiteErrorObject } from "@/shared/types/SiteErrorObject.js";
import { SiteError } from "./SiteError.js";

interface SecondaryRequestErrorObject extends SiteErrorObject {
    error?: string;

    errorDescription?: string;
}

/**
 * Error thrown when an API call made by the server to another server fails.
 *
 * Although this **should** have a status code of 502 (Bad Gateway), Cloudflare likes to overwrite
 * 502 errors with its own error page, so 501 is used instead.
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/502 MDN Reference}
 */
// oxlint-disable-next-line typescript/no-unnecessary-type-arguments WRONG
export class SecondaryRequestError extends SiteError<SecondaryRequestErrorObject> {
    protected override statusCode = 501; // bad gateway (see JSDoc comment above)

    public constructor(baseError: SiteErrorObject, cause: unknown) {
        const payload: SecondaryRequestErrorObject = { ...baseError };

        if (typeof cause === "object" && cause !== null) {
            if ("error" in cause && typeof cause.error === "string") {
                payload.error = cause.error;
            }

            if ("error_description" in cause && typeof cause.error_description === "string") {
                payload.errorDescription = cause.error_description;
            }
        }

        super(payload, { cause });
    }
}

export const SECONDARY_REQUEST_ERROR = {
    description:
        "Error thrown when an API call made by the server to another server fails.\n\nAlthough this **should** have a status code of 502 (Bad Gateway), Cloudflare likes to overwrite 502 errors with its own error page, so 501 is used instead.\n\n[MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/502)",
    content: {
        "application/json": {
            schema: {
                ...SITE_ERROR_OBJECT,
                properties: {
                    ...SITE_ERROR_OBJECT.properties,
                    error: { type: "string" },
                    errorDescription: { type: "string" },
                },
            },
        },
    },
} as const satisfies OAS.Response;
