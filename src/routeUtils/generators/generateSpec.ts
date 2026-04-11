import { config } from "@/global/config";
import { allRoutes } from "@/routes/allRoutes";
import { generateDescription } from "@/routeUtils/generators/generateDescription";
import {
    generatePathParameters,
    generateQueryParameters,
} from "@/routeUtils/generators/generateParameters";
import { generateRequestBody } from "@/routeUtils/generators/generateRequestBody";
import { generateResponses } from "@/routeUtils/generators/generateResponses";
import { generateServers } from "@/routeUtils/generators/generateServers";
import type { OAS } from "@/shared/global/OAS";
import { writeFileSync } from "node:fs";

export function generateSpec(): void {
    const output: OAS.RootDocument = {
        openapi: "3.0.3",
        info: {
            title: "Pantheon API",
            description: generateDescription(),
            version: config.commitHash || "unknown",
        },
        servers: generateServers(),
        paths: {},
        components: {
            securitySchemes: {
                userToken: {
                    type: "http",
                    scheme: "bearer",
                },
            },
        },
    };

    if (config.environment === "development") {
        output.$schema = "../.github/openapi.schema.json";
    }

    for (const endpoint of allRoutes) {
        const { method, path, description, tags } = endpoint;

        const specPath = path.replaceAll(/:([A-Za-z0-9_]+)/g, "{$1}");

        const operation: OAS.Operation = {
            description: description,
            operationId: `${method}${path}`,
            tags: tags,
            ...generateResponses(endpoint),
            ...generateRequestBody(endpoint),
        };

        const parameters = [
            ...generatePathParameters(endpoint),
            ...generateQueryParameters(endpoint),
        ];

        if (parameters.length > 0) {
            operation.parameters = parameters;
        }

        if (output.paths[specPath] !== undefined) {
            if (output.paths[specPath][method] !== undefined) {
                throw new Error(`Tried to register a duplicate endpoint against ${method} ${path}`);
            }

            output.paths[specPath][method] = operation;
        } else {
            output.paths[specPath] = { [method]: operation };
        }
    }

    writeFileSync("static/spec.json", JSON.stringify(output, undefined, 4), "utf-8");
}
