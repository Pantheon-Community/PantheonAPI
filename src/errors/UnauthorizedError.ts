import type { Response } from "express";
import { SiteError } from "./SiteError";

/**
 * Error thrown when a request is made with missing or malformed credentials, such as having an
 * invalid site token.
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/401 MDN Reference}
 */
export abstract class UnauthorizedError extends SiteError {
    protected override statusCode = 401; // unauthorized

    public override makeResponse(res: Response): void {
        res.setHeader("WWW-Authenticate", "Bearer");
        super.makeResponse(res);
    }
}

export class MissingTokenError extends UnauthorizedError {
    public constructor() {
        super({
            title: "Missing Token",
            description: 'A token was not provided in the "Authorization" header.',
        });
    }
}
