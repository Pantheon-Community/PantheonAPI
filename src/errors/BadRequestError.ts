import type { OAS } from "@/shared/global/OAS";
import { SITE_ERROR_OBJECT } from "@/shared/types/SiteErrorObject";
import { SiteError } from "./SiteError";

/**
 * Error thrown when an invalid request is made, such as missing required body fields or passing in
 * a string where a number was expected.
 *
 * Note this does not include errors around the validity of the authorization header.
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/400 MDN Reference}
 */
export class BadRequestError extends SiteError {
    protected override statusCode = 400; // bad request
}

export const BAD_REQUEST_ERROR = {
    description:
        "Error thrown when an invalid request is made, such as missing required body fields or passing in a string where a number was expected.\n\nNote this does not include errors around the validity of the authorization header.\n\n[MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/400)",
    content: {
        "application/json": {
            schema: {
                ...SITE_ERROR_OBJECT,
                example: {
                    title: "Invalid Request",
                    description: "You are too stinky to complete this request.",
                },
            },
        },
    },
} as const satisfies OAS.Response;
