import { config } from "@/global/config";
import type { RequestHandler } from "express";
import { middleware } from "express-openapi-validator";

export function validationMiddleware(): RequestHandler[] {
    return middleware({
        apiSpec: "openapi.json",
        validateRequests: true,
        validateResponses: config.environment === "development",
        validateApiSpec: false,
    });
}
