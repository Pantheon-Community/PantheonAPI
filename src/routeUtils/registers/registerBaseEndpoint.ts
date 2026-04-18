import { app } from "@/global/app";
import { config } from "@/global/config";
import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { getFingerprint } from "@/utils/getFingerprint";
import { log, logWithTimeTaken } from "@/utils/logging";
import { ServerTimer } from "@/utils/serverTimer";
import type { Request, Response } from "express";
import { makeResultHandler } from "../makeResultHandler";
import { makeValidators } from "../makeValidators";

export function registerBaseEndpoint(
    endpoint: AnyEndpoint,
    handler: (req: Request, res: Response, timer: ServerTimer) => Promise<unknown>,
): void {
    const validate = makeValidators(endpoint);
    const handleResult = makeResultHandler(endpoint);

    if (config.dev.logEverything) {
        app[endpoint.method](endpoint.path, (req, res, next) => {
            const startTime = Date.now();

            log(`${getFingerprint(req).ip} START ${req.method.toUpperCase()} ${req.url}`);

            validate(req);

            const timer = new ServerTimer();

            handler(req, res, timer)
                .then((result) => {
                    timer.addTo(res);

                    handleResult(res, result);
                })
                .catch((error) => {
                    timer.addTo(res);

                    next(error);
                })
                .finally(() => {
                    logWithTimeTaken(
                        `${getFingerprint(req).ip} END ${req.method.toUpperCase()} ${req.url}`,
                        startTime,
                    );
                });
        });

        return;
    }

    app[endpoint.method](endpoint.path, (req, res, next) => {
        validate(req);

        const timer = new ServerTimer();

        handler(req, res, timer)
            .then((result) => {
                timer.addTo(res);

                handleResult(res, result);
            })
            .catch((error) => {
                timer.addTo(res);

                next(error);
            });
    });
}
