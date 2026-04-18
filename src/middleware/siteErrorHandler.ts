import { BadRequestError } from "@/errors/BadRequestError";
import { SiteError } from "@/errors/SiteError";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log } from "@/utils/logging";
import type { ErrorRequestHandler } from "express";

/** Logs all errors to the console, for use in development. */
export function devSiteErrorHandler(): ErrorRequestHandler {
    return (err, req, _res, next): void => {
        if (err instanceof Error) {
            log(colorize(`${req.method} ${req.url} >> ${err.name}`, Color.FgRed));

            if (err.cause) {
                console.error(err.cause);
            }
        }

        next(err);
    };
}

/** Creates relevant responses for expected errors. */
export function siteErrorHandler(): ErrorRequestHandler {
    return (err, _req, res, next): void => {
        if (err instanceof SiteError) {
            err.makeResponse(res);
        } else if (err instanceof SyntaxError && err.message.startsWith("JSON Parse error")) {
            new BadRequestError({
                title: "Invalid Request",
                description: err.message,
            }).makeResponse(res);
        } else {
            next(err);
        }
    };
}
