import type { SiteErrorObject } from "@/shared/types/SiteErrorObject.js";
import { SiteError } from "./SiteError.js";

/**
 * Error thrown when an API call made by the server to another server fails.
 *
 * Although this **should** have a status code of 502 (Bad Gateway), Cloudflare likes to overwrite
 * 502 errors with it's own error page, so 501 is used instead.
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/502 MDN Reference}
 */
export class SecondaryRequestError extends SiteError {
	protected override statusCode = 501; // Bad Gateway (see JSDoc comment above)

	public constructor(payload: SiteErrorObject, cause: unknown) {
		super(payload, { cause });
	}
}
