import { BadRequestError } from "@/errors/BadRequestError";
import type { SpecObject } from "@/shared/types/Util";
import type { AnyEndpoint } from "@/types/Express/Endpoint";
import type { Request } from "express";
import { makeParameterTransformers } from "./makeParameterTransformers";

type WithRequestFn = (req: Request) => void;

function doNothing(): void {}

function wrappedValidate(this: (input: unknown) => void, input: unknown): void {
    try {
        this(input);
    } catch (error) {
        if (error instanceof Error) {
            throw new BadRequestError({ title: "Invalid Request", description: error.message });
        }

        throw error;
    }
}

function validateRequest(spec: SpecObject): WithRequestFn {
    const validate = wrappedValidate.bind(spec.validate.bind(spec));

    return (req) => validate(req.body);
}

function validatePath(spec: SpecObject): WithRequestFn {
    const validate = wrappedValidate.bind(spec.validate.bind(spec));

    return (req) => validate(req.params);
}

function validateQuery(spec: SpecObject): WithRequestFn {
    const validate = wrappedValidate.bind(spec.validate.bind(spec));

    return (req) => validate(req.query);
}

function callEvery(this: WithRequestFn[], req: Request): void {
    this.forEach((fn) => fn(req));
}

export function makeValidators(endpoint: AnyEndpoint): WithRequestFn {
    const { requestBody, pathParams, queryParams } = endpoint;

    const output: WithRequestFn[] = [];

    if (requestBody !== null) {
        output.push(validateRequest(requestBody));
    }

    if (pathParams !== null) {
        output.push(...makeParameterTransformers(pathParams, "params"), validatePath(pathParams));
    }

    if (queryParams !== null) {
        output.push(...makeParameterTransformers(queryParams, "query"), validateQuery(queryParams));
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
