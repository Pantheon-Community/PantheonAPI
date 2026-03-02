import { readFileSync } from "node:fs";
import { join } from "node:path";
import { static as serveStatic } from "express";
import { serve, setup } from "swagger-ui-express";
import { app } from "@/global/app";
import { config } from "@/global/config";
import { authRoutes } from "./auth/authRoutes";
import { lookupRoutes } from "./lookup/lookupRoutes";
import { miscRoutes } from "./miscellaneous/miscRoutes";
import { registerProvider } from "./registerProvider";
import { userRoutes } from "./user/userRoutes";

/** Adds the `/api-spec` and `/spec` routes to the app. */
function addApiSpecRoutes(): void {
	const apiSpec = JSON.parse(
		readFileSync(join(import.meta.dirname, "..", "..", "openapi.json"), "utf-8"),
	);

	if (config.environment === "development") {
		const servers = apiSpec?.servers;

		if (Array.isArray(servers)) {
			servers.reverse();
		}
	}

	app.use(
		"/api-docs",
		serve,
		setup(apiSpec, {
			customSiteTitle: "Pantheon API",
			customJs: "/noDarkMode.js",
			customfavIcon: "/favicon.ico",
		}),
	);
}

export function addStaticRoutes(): void {
	addApiSpecRoutes();

	app.use("/noDarkMode.js", serveStatic("static/noDarkMode.js"));

	app.use("/favicon.ico", serveStatic("static/favicon.ico"));

	app.use("/sonar.webp", serveStatic("static/sonar.webp"));

	app.use("/spec", serveStatic("openapi.json"));
}

/** Adds normal routes to the app. */
export function addRoutes(): void {
	for (const provider of [...authRoutes, ...miscRoutes, ...userRoutes, ...lookupRoutes]) {
		registerProvider(provider);
	}
}
