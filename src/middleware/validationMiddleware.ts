import type { RequestHandler } from "express";
import { middleware } from "express-openapi-validator";
import { config } from "@/global/config";

export function validationMiddleware(): RequestHandler[] {
	return middleware({
		apiSpec: "openapi.json",
		validateRequests: true,
		validateResponses: config.environment === "development",
		validateApiSpec: false,
	});
}
