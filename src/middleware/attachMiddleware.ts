import { app } from "@/global/app";
import { config } from "@/global/config";
import { json } from "express";
import { corsMiddleware } from "./corsMiddleware";
import { postgresErrorHandler } from "./postgresErrorHandler";
import { rateLimitingMiddleware } from "./rateLimitingMiddleware";
import { devSiteErrorHandler, siteErrorHandler } from "./siteErrorHandler";

/** Attaches pre-route middleware to the API, such as authentication and input validation logic. */
export function attachPreRouteMiddleware(): void {
    app.use(json());
    app.use(corsMiddleware());
    app.use(rateLimitingMiddleware());
}

/** Attaches post-route middleware to the API, such as error catching. */
export function attachPostRouteMiddleware(): void {
    if (config.environment === "development") {
        app.use(devSiteErrorHandler());
    }

    app.use(siteErrorHandler());

    app.use(postgresErrorHandler());

    app.use((_req, res, _next) => {
        res.status(404).send(
            `<img src="/sonar.webp" alt="Sonar from Dispatch laughs at your inability to find our endpoints">`,
        );
    });
}
