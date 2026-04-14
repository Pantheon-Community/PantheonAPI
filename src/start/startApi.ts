import { app } from "@/global/app";
import { config } from "@/global/config";
import { attachPostRouteMiddleware, attachPreRouteMiddleware } from "@/middleware/attachMiddleware";
import { allRoutes } from "@/routes/allRoutes";
import { generateSpec } from "@/routeUtils/generators/generateSpec";
import { registerEndpoint } from "@/routeUtils/registers/registerEndpoint";
import { Color } from "@/types/Color";
import type { TeardownFn } from "@/types/TeardownFn";
import { colorize } from "@/utils/colorize";
import { logWithTimeTaken } from "@/utils/logging";
import { static as serveStatic } from "express";
import { createServer, Server } from "node:http";

function setupAppEnv(): void {
    const { environment, api } = config;
    const { numProxies } = api;

    if (environment) {
        app.set("env", environment);
    }

    if (numProxies > 0) {
        app.set("trust proxy", numProxies);
    }
}

function startListeningOnPort(): Promise<[Server, string]> {
    const server = createServer(app);

    return new Promise<[Server, string]>((resolve) => {
        server.listen(config.api.port, () => {
            const addressData = server.address();

            let reportedLocation: string;
            let color: Color;

            if (addressData === null) {
                reportedLocation = "an unknown address";
                color = Color.FgRed;
            } else if (typeof addressData === "string") {
                reportedLocation = addressData;
                color = Color.FgCyan;
            } else {
                const { address, port: actualPort } = addressData;
                reportedLocation = `http://${address.replace("::", "localhost")}:${actualPort}`;
                color = Color.FgCyan;
            }

            resolve([server, colorize(reportedLocation, color)]);
        });
    });
}

export async function startApi(): Promise<TeardownFn> {
    const startedAt = Date.now();

    setupAppEnv();

    app.use("/", serveStatic("static"));

    app.use("/assets", serveStatic("assets", { maxAge: 1_000 * 60 * 60 * 24 * 7 }));

    attachPreRouteMiddleware();

    generateSpec();

    for (const endpoint of allRoutes) {
        registerEndpoint(endpoint);
    }

    attachPostRouteMiddleware();

    const [server, listeningOn] = await startListeningOnPort();

    logWithTimeTaken(`Web API listening on ${listeningOn}`, startedAt);

    return (receivedAt) => {
        return new Promise((resolve) => {
            server.close(() => {
                logWithTimeTaken(`Web API closed`, receivedAt);
                resolve();
            });
        });
    };
}
