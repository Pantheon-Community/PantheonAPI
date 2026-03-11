import { app } from "@/global/app";
import { config } from "@/global/config";
import { static as serveStatic } from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serve, setup } from "swagger-ui-express";
import { authRoutes } from "./auth/authRoutes";
import { lookupRoutes } from "./lookup/lookupRoutes";
import { miscRoutes } from "./miscellaneous/miscRoutes";
import { registerEndpoint } from "./registerEndpoint";
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
            customCssUrl: "/betterDarkMode.css",
            customfavIcon: "/favicon.ico",
        }),
    );
}

export function addStaticRoutes(): void {
    addApiSpecRoutes();

    app.use("/", serveStatic("static"));

    app.use("/spec", serveStatic("openapi.json"));
}

/** Adds normal routes to the app. */
export function addRoutes(): void {
    for (const provider of [...authRoutes, ...miscRoutes, ...userRoutes, ...lookupRoutes]) {
        registerEndpoint(provider);
    }
}
