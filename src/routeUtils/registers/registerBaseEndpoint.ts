import { app } from "@/global/app";
import type { AnyEndpoint } from "@/types/Express/Endpoint";
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
