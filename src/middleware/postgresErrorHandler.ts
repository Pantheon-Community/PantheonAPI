import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log } from "@/utils/logging";
import { SQL } from "bun";
import type { ErrorRequestHandler } from "express";

export function postgresErrorHandler(): ErrorRequestHandler {
    return (err, req, _res, next) => {
        if (!(err instanceof Error)) {
            next(err);
            return;
        }

        if (!(err.cause instanceof SQL.PostgresError)) {
            next(err);
            return;
        }

        log(colorize(`${req.method} ${req.url} >> ${err.cause.code}`, Color.FgRed));

        if (err.cause.detail) log(`Detail: ${err.cause.detail}`);
        if (err.cause.hint) log(`Hint: ${colorize(err.cause.hint, Color.FgGreen)}`);

        next(err);
    };
}
