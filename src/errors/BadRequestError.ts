import type {
	HttpError,
	ValidationErrorItem,
} from "express-openapi-validator/dist/framework/types";
import type { SiteErrorObject } from "@/shared/types/SiteErrorObject";
import { SiteError } from "./SiteError";

export interface InvalidRequestErrorObject extends SiteErrorObject {
	message?: string;

	extra?: ValidationErrorItem[];
}

/**
 * Error thrown when an invalid request is made, such as missing required body fields or passing in
 * a string where a number was expected.
 *
 * Note this does not include errors around the validity of the authorization header.
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/400 MDN Reference}
 */
abstract class BadRequestError extends SiteError<InvalidRequestErrorObject> {
	protected override statusCode = 400; // Bad Request
}

export class InvalidOriginError extends BadRequestError {
	public constructor(origin: string) {
		super({
			title: "Invalid Origin",
			description: `The origin header of your request ("${origin}") isn't in the approvied client URLs list.`,
		});
	}
}

export class InvalidRequestError extends BadRequestError {
	public constructor(error: HttpError) {
		super({
			title: "Invalid Request",
			description: "Your client made an invalid request to the API.",
			message: error.message,
			extra: error.errors,
		});
	}
}
