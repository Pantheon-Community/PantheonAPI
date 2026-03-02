import { json } from "express";
import { app } from "@/global/app";
import { config } from "@/global/config";
import { corsMiddleware } from "./corsMiddleware";
import { postgresErrorHandler } from "./postgresErrorHandler";
import { rateLimitingMiddleware } from "./rateLimitingMiddleware";
import { devSiteErrorHandler, siteErrorHandler } from "./siteErrorHandler";
import { validationMiddleware } from "./validationMiddleware";
import { validatorErrorHandler } from "./validatorErrorHandler";

/** Attaches pre-route middleware to the API, such as authentication and input validation logic. */
export function attachPreRouteMiddleware(): void {
	app.use(json());
	app.use(corsMiddleware());
	app.use(rateLimitingMiddleware());
	app.use(validationMiddleware());
	app.use(validatorErrorHandler());
}

/** Attaches post-route middleware to the API, such as error catching. */
export function attachPostRouteMiddleware(): void {
	if (config.environment === "development") {
		app.use(devSiteErrorHandler());
	}

	app.use(siteErrorHandler());
	app.use(postgresErrorHandler());
}
