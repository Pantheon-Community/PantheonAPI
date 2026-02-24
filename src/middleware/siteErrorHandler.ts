import type { ErrorRequestHandler, Response } from "express";
import { SiteError } from "@/errors/SiteError";
import type { SiteErrorObject } from "@/shared/SiteErrorObject";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log } from "@/utils/logging";

export function devSiteErrorHandler(): ErrorRequestHandler {
	return (err, req): void => {
		if (err instanceof SiteError) {
			log(colorize(`${req.method} ${req.url} >> ${err.name}`, Color.FgRed));

			console.error(err);
		}
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
