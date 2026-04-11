import { BAD_REQUEST_ERROR } from "@/errors/BadRequestError";
import { FORBIDDEN_ERROR } from "@/errors/ForbiddenError";
import { NOT_FOUND_ERROR } from "@/errors/NotFoundError";
import { SECONDARY_REQUEST_ERROR } from "@/errors/SecondaryRequestError";
import { INTERNAL_SERVER_ERROR } from "@/errors/SiteError";
import { UNAUTHORIZED_ERROR } from "@/errors/UnauthorizedError";
import { RATE_LIMITED_ERROR } from "@/middleware/rateLimitingMiddleware";
import type { OAS } from "@/shared/global/OAS";
import { has } from "@/shared/utils/bitfieldHelpers";
import { AuthScope } from "@/types/Express/AuthScope";
import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";

export function generateResponses(
    endpoint: AnyEndpoint,
): Pick<OAS.Operation, "responses" | "security"> {
    const { method, path, flags } = endpoint;

    const mainResponseCode = flags !== undefined && has(flags, EndpointFlags.NoContent) ? 204 : 200;

    const responses: OAS.Responses = {
        [mainResponseCode]: generateMainResponse(endpoint),
        400: BAD_REQUEST_ERROR,
        429: RATE_LIMITED_ERROR,
        500: INTERNAL_SERVER_ERROR,
    };

    let security: OAS.SecurityRequirement[] | undefined = undefined;

    switch (endpoint.auth) {
        // @ts-expect-error rare valid use of switch fallthrough :O
        case AuthScope.Permission:
            responses[403] = FORBIDDEN_ERROR;

        case AuthScope.Session:
            responses[401] = UNAUTHORIZED_ERROR;
            security = [{ userToken: [] }];
            break;

        case AuthScope.None:
            break;
    }

    if (flags !== undefined) {
        if (has(flags, EndpointFlags.May403)) {
            if (responses[403] !== undefined) {
                throw new Error(`Endpoint ${method} ${path} does not need the May403 flag`);
            }

            responses[403] = FORBIDDEN_ERROR;
        }

        if (has(flags, EndpointFlags.May404)) {
            responses[404] = NOT_FOUND_ERROR;
        }

        if (has(flags, EndpointFlags.MakesSecondaryRequests)) {
            responses[501] = SECONDARY_REQUEST_ERROR;
        }
    }

    if (security !== undefined) {
        return { responses, security };
    }

    return { responses };
}

function generateMainResponse(endpoint: AnyEndpoint): OAS.Response {
    const { returns, responseBody } = endpoint;

    const output: OAS.Response = { description: returns };

    if (responseBody !== null) {
        if (responseBody.schema.type === "string") {
            output.content = {
                "text/html": {
                    schema: responseBody.schema,
                },
            };
        } else {
            output.content = {
                "application/json": {
                    schema: responseBody.schema,
                },
            };
        }
    }

    return output;
}
