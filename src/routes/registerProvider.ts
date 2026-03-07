import { updateUserAnalytics } from "@/databases/users/updateUserAnalytics";
import { getUserSession } from "@/databases/userSessions/getUserSession";
import { getUserSessionAndUser } from "@/databases/userSessions/getUserSessionAndUser";
import { updateUserSession } from "@/databases/userSessions/updateUserSession";
import { doInBackground } from "@/databases/utils/doInBackground";
import { MissingTokenError } from "@/errors/UnauthorizedError";
import { app } from "@/global/app";
import type { DiscordId, UserToken } from "@/shared/types/Common";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import type { InternalSession, InternalUser } from "@/types/Internal";
import { getAnalytics } from "@/utils/getAnalytics";
import { ServerTimer } from "@/utils/serverTimer";
import type { Request, Response } from "express";

function getToken(req: Request): UserToken | null {
    let value = req.get("Authorization");

    if (value === undefined) {
        return null;
    }

    value = value.trim();

    if (value.toLowerCase().startsWith("bearer")) {
        value = value.slice("bearer".length);
    }

    return value.trim() as UserToken;
}

function updateUserAnalyticsInBackground(id: DiscordId, req: Request): void {
    doInBackground(updateUserAnalytics, id, getAnalytics(req));
}

function updateUserSessionInBackgroundReal(token: UserToken, req: Request): void {
    doInBackground(updateUserSession, token, getAnalytics(req));
}

export function registerProvider(provider: Endpoint<any, any, any, any>): void {
    let handler: (req: Request, res: Response, timer: ServerTimer) => Promise<void>;

    const updateUserSessionInBackground = provider.noUpdateSessions
        ? (): void => {}
        : updateUserSessionInBackgroundReal;

    switch (provider.auth) {
        case AuthScope.None:
            handler = async function (req, res, timer): Promise<void> {
                await provider.handleRequest({ req, res, timer });
            };
            break;

        case AuthScope.TokenOnly:
            handler = async function (req, res, timer): Promise<void> {
                const token = getToken(req);

                if (token === null) {
                    throw new MissingTokenError();
                }

                let session: InternalSession;

                {
                    using _ = timer.create(getUserSession);

                    session = await getUserSession(token);
                }

                updateUserAnalyticsInBackground(session.userId, req);
                updateUserSessionInBackground(token, req);

                await provider.handleRequest({ req, res, timer, session });
            };
            break;

        case AuthScope.OptionalUser:
            handler = async function (req, res, timer): Promise<void> {
                const token = getToken(req);

                if (token === null) {
                    await provider.handleRequest({ req, res, timer, session: null, user: null });
                    return;
                }

                let session: InternalSession;
                let user: InternalUser;

                {
                    using _ = timer.create(getUserSessionAndUser);

                    const result = await getUserSessionAndUser(token);

                    session = result.session;
                    user = result.user;
                }

                updateUserAnalyticsInBackground(user.id, req);
                updateUserSessionInBackground(token, req);

                await provider.handleRequest({ req, res, timer, session, user });
            };
            break;

        case AuthScope.User:
            handler = async function (req, res, timer): Promise<void> {
                const token = getToken(req);

                if (token === null) {
                    throw new MissingTokenError();
                }

                let session: InternalSession;
                let user: InternalUser;

                {
                    using _ = timer.create(getUserSessionAndUser);

                    const result = await getUserSessionAndUser(token);

                    session = result.session;
                    user = result.user;
                }

                updateUserAnalyticsInBackground(user.id, req);
                updateUserSessionInBackground(token, req);

                await provider.handleRequest({ req, res, timer, session, user });
            };
            break;

        default:
            throw new Error(`Provider for ${AuthScope[provider.auth]} auth not implemented yet`);
    }

    app[provider.method](provider.path, (req, res, next) => {
        handler(req, res, new ServerTimer()).catch(next);
    });
}
