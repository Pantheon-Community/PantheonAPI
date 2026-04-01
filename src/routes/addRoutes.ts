import { app } from "@/global/app";
import { config } from "@/global/config";
import { static as serveStatic } from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serve, setup } from "swagger-ui-express";
import { postLogin } from "./auth/postLogin";
import { postLogout } from "./auth/postLogout";
import { postRefresh } from "./auth/postRefresh";
import { getDiscordToSteam } from "./lookups/getDiscordToSteam";
import { getSteamDirect } from "./lookups/getSteamDirect";
import { getSteamToDiscord } from "./lookups/getSteamToDiscord";
import { getIp } from "./miscellaneous/getIp";
import { registerEndpoint } from "./registerEndpoint";
import { getRoles } from "./roles/getRoles";
import { postRoles } from "./roles/postRoles";
import { deleteRole } from "./roles/singular/deleteRole";
import { patchRole } from "./roles/singular/patchRole";
import { deleteMeSession } from "./users/deleteMeSession";
import { deleteMeSteamUsersPrimary } from "./users/deleteMeSteamUsersPrimary";
import { getAllUsers } from "./users/getAllUsers";
import { getMe } from "./users/getMe";
import { getMeRoles } from "./users/getMeRoles";
import { getMeSessions } from "./users/getMeSessions";
import { getMeSteamUsers } from "./users/getMeSteamUsers";
import { putMeSteamUsersPrimary } from "./users/putMeSteamUsersPrimary";

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
    for (const provider of [
        // auth
        postLogin,
        postLogout,
        postRefresh,
        // lookup
        getDiscordToSteam,
        getSteamToDiscord,
        getSteamDirect,
        // miscellaneous
        getIp,
        // roles
        deleteRole,
        patchRole,
        getRoles,
        postRoles,
        // user
        deleteMeSession,
        deleteMeSteamUsersPrimary,
        getAllUsers,
        getMe,
        getMeRoles,
        getMeSessions,
        getMeSteamUsers,
        putMeSteamUsersPrimary,
    ]) {
        registerEndpoint(provider);
    }
}
