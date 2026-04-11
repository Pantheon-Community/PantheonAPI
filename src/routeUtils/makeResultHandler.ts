import { config } from "@/global/config";
import type { SpecObject } from "@/shared/types/Util";
import { has } from "@/shared/utils/bitfieldHelpers";
import { Color } from "@/types/Color";
import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { colorize } from "@/utils/colorize";
import { log } from "@/utils/logging";
import type { Response } from "express";

type ResponseFn = (res: Response, data: unknown) => void;

function doNothing(): void {}

function validateResponse(this: SpecObject, res: Response, data: unknown): void {
    try {
        this.validate(data);
    } catch (error) {
        if (error instanceof Error) {
            const { method, url } = res.req;

            log(
                `Invalid response returned by ${colorize(`${method} ${url}`, Color.FgRed)}: ${error.message}`,
            );
        }
    }
}

function send204(res: Response): void {
    res.sendStatus(204);
}

function send200(res: Response, data: unknown): void {
    res.status(200).send(data);
}

function callEvery(this: ResponseFn[], res: Response, data: unknown): void {
    this.forEach((fn) => fn(res, data));
}

export function makeResultHandler(endpoint: AnyEndpoint): ResponseFn {
    const { flags, responseBody } = endpoint;

    const output: ResponseFn[] = [];

    if (config.environment === "development" && responseBody !== null) {
        output.push(validateResponse.bind(responseBody));
    }

    if (flags !== undefined && has(flags, EndpointFlags.NoContent)) {
        output.push(send204);
    } else {
        output.push(send200);
    }

    switch (output.length) {
        case 0:
            return doNothing;
        case 1:
            return output[0]!;
        default:
            return callEvery.bind(output);
    }
}
