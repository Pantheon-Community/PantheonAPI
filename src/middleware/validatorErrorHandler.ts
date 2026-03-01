import type { ErrorRequestHandler } from "express";
import { HttpError } from "express-openapi-validator/dist/framework/types";
import { InvalidRequestError } from "@/errors/BadRequestError";
import { MissingTokenError } from "@/errors/UnauthorizedError";

export function validatorErrorHandler(): ErrorRequestHandler {
	return (err, _req, res, next): void => {
		if (!(err instanceof HttpError)) {
			next(err);
			return;
		}

		// I love non-spec-conformant validation libraries, so cool!
		switch (err.message) {
			case "not found":
				res.status(404).send(
					`<img src="/sonar.webp" alt="Sonar from Dispatch laughs at your inability to find our endpoints">`,
				);
				break;
			case "Authorization header required":
				next(new MissingTokenError());
				break;
			default:
				next(new InvalidRequestError(err));
		}
	};
}
