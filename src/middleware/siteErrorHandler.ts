import type { ErrorRequestHandler, Response } from "express";
import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import { SiteError } from "@/errors/SiteError";
import type { SiteErrorObject } from "@/shared/types/SiteErrorObject";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log } from "@/utils/logging";

export function devSiteErrorHandler(): ErrorRequestHandler {
	return (err, req, _res, next): void => {
		if (err instanceof SecondaryRequestError) {
			log(colorize(`${req.method} ${req.url} >> ${err.name}`, Color.FgRed));

			if (err.cause) {
				console.error(err.cause);
			}
		}

		next(err);
	};
}

export function siteErrorHandler(): ErrorRequestHandler {
	return (err, _req, res: Response<SiteErrorObject>, next): void => {
		if (err instanceof SiteError) {
			err.makeResponse(res);
		} else {
			next(err);
		}
	};
}
