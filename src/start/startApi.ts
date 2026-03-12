import { app } from "@/global/app";
import { config } from "@/global/config";
import { attachPostRouteMiddleware, attachPreRouteMiddleware } from "@/middleware/attachMiddleware";
import { addRoutes, addStaticRoutes } from "@/routes/addRoutes";
import { Color } from "@/types/Color";
import type { TeardownFn } from "@/types/TeardownFn";
import { colorize } from "@/utils/colorize";
import { logWithTimeTaken } from "@/utils/logging";
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

    addStaticRoutes();

    attachPreRouteMiddleware();

    addRoutes();

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
