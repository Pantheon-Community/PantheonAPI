import type { OAS } from "@/shared/global/OAS";
import { SITE_ERROR_OBJECT } from "@/shared/types/SiteErrorObject";
import type { Response } from "express";
import { SiteError } from "./SiteError";

/**
 * Error thrown when a request is made with missing or malformed credentials, such as having an
 * invalid site token.
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/401 MDN Reference}
 */
export class UnauthorizedError extends SiteError {
    protected override statusCode = 401; // unauthorized

    public override makeResponse(res: Response): void {
        res.setHeader("WWW-Authenticate", "Bearer");
        super.makeResponse(res);
    }
}

export const UNAUTHORIZED_ERROR = {
    description:
        "Error thrown when a request is made with missing or malformed credentials, such as having an invalid site token.\n\n[MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/401)",
    content: {
        "application/json": {
            schema: {
                ...SITE_ERROR_OBJECT,
                example: {
                    title: "Missing Token",
                    description: 'A token was not provided in the "Authorization" header.',
                },
            },
        },
    },
    headers: { "WWW-Authenticate": { schema: { type: "string", example: "Bearer" } } },
} as const satisfies OAS.Response;
