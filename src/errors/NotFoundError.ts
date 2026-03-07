import { SiteError } from "./SiteError";

/**
 * Error thrown when a resource does not exist in the relevant database.
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/404 MDN Reference}
 */
export class NotFoundError extends SiteError {
    protected override statusCode = 404; // not found
}
