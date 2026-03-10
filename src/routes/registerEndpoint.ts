import { updateUserAnalytics } from "@/databases/users/updateUserAnalytics";
import { getUserSession } from "@/databases/userSessions/getUserSession";
import { updateSessionAnalytics } from "@/databases/userSessions/updateSessionAnalytics";
import { MissingTokenError } from "@/errors/UnauthorizedError";
import { app } from "@/global/app";
import type { UserToken } from "@/shared/types/Common";
import { Color } from "@/types/Color";
import type { AnyRequest } from "@/types/Express/AnyRequest";
import { AuthScope } from "@/types/Express/AuthScope";
import type {
    AnyEndpoint,
    Endpoint,
    NoAuthEndpoint,
    SessionAuthEndpoint,
} from "@/types/Express/Endpoint";
import { colorize } from "@/utils/colorize";
import { getAnalytics } from "@/utils/getAnalytics";
import { log } from "@/utils/logging";
import { ServerTimer } from "@/utils/serverTimer";
import type { Request, Response } from "express";

function getToken(req: AnyRequest): UserToken | null {
    let value = req.get("authorization");

    if (value === undefined) {
        return null;
    }

    value = value.trim();

    if (value.toLowerCase().startsWith("bearer")) {
        value = value.slice(6);
    }

    return value.trim() as UserToken;
}

function registerBaseEndpoint(
    endpoint: Endpoint,
    handler: (req: Request, res: Response, timer: ServerTimer) => Promise<unknown>,
): void {
    app[endpoint.method](endpoint.path, (req, res, next) => {
        const timer = new ServerTimer();

        handler(req, res, timer)
            .then((result) => {
                timer.addTo(res);

                res.status(200).send(result);
            })
            .catch((error) => {
                timer.addTo(res);

                next(error);
            });
    });
}

function registerNoAuthEndpoint(endpoint: NoAuthEndpoint): void {
    registerBaseEndpoint(endpoint, async function (req, res, timer) {
        return await endpoint.handleRequest({ req, res, timer });
    });
}

function registerSessionAuthEndpoint(endpoint: SessionAuthEndpoint): void {
    const finalUpateSessionAnalytics = endpoint.skipSessionUpdates
        ? async (): Promise<void> => {}
        : updateSessionAnalytics;

    registerBaseEndpoint(endpoint, async function (req, res, timer) {
        const token = getToken(req);

        if (token === null) {
            throw new MissingTokenError();
        }

        const session = await getUserSession(token, timer);

        const analytics = getAnalytics(req);

        updateUserAnalytics(session.userId, analytics).catch((error) => {
            log(
                `Background update of user analytics for ${colorize(session.userId, Color.FgCyan)} errored!`,
            );
            console.error(error);
        });

        finalUpateSessionAnalytics(token, analytics).catch((error) => {
            log(
                `Background update of session analytics for ${colorize(session.userId, Color.FgCyan)} errored!`,
            );
            console.error(error);
        });

        return await endpoint.handleRequest({ req, res, timer, session, analytics });
    });
}

export function registerEndpoint(provider: AnyEndpoint): void {
    switch (provider.auth) {
        case AuthScope.None:
            return registerNoAuthEndpoint(provider);

        case AuthScope.Session:
            return registerSessionAuthEndpoint(provider);
    }
}
