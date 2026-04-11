import type { OAS } from "@/shared/global/OAS";
import type { AnyEndpoint } from "@/types/Express/Endpoint";

export function generateRequestBody(endpoint: AnyEndpoint): Pick<OAS.Operation, "requestBody"> {
    const { requestBody } = endpoint;

    if (requestBody === null) {
        return {};
    }

    if (requestBody.schema.type === "string") {
        return {
            requestBody: {
                required: true,
                content: {
                    "text/html": {
                        schema: requestBody.schema,
                    },
                },
            },
        };
    }

    return {
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: requestBody.schema,
                },
            },
        },
    };
}
