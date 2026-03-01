import type { Request, Response } from "express";
import { updateUserAnalytics } from "@/databases/userAnalytics/updateUserAnalytics";
import { getUserSession } from "@/databases/userSessions/getUserSession";
import { getUserSessionAndUser } from "@/databases/userSessions/getUserSessionAndUser";
import type { UserSessionModel } from "@/databases/userSessions/model/userSessionsModel";
import { updateUserSession } from "@/databases/userSessions/updateUserSession";
import type { UserModel } from "@/databases/users/model/userModel";
import { doInBackground } from "@/databases/utils/doInBackground";
import { MissingTokenError } from "@/errors/UnauthorizedError";
import { app } from "@/global/app";
import type { DiscordId, UserToken } from "@/shared/types/Common";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";
import { getIp } from "@/utils/getIp";
import { getUserAgent } from "@/utils/getUserAgent";
import { ServerTimer } from "@/utils/serverTimer";

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
	doInBackground(updateUserAnalytics, id, getIp(req), getUserAgent(req));
}

function realUserSessionBackgroundUpdater(token: UserToken, req: Request): void {
	doInBackground(updateUserSession, token, getIp(req), getUserAgent(req));
}

function fakeUserSessionBackgroundUpdater(): void {}

// biome-ignore lint/suspicious/noExplicitAny: unknown just doesn't work as a default here
export function registerProvider(provider: EndpointProvider<any, any, any, any>): void {
	let handler: (req: Request, res: Response, timer: ServerTimer) => Promise<void>;

	const updateUserSessionInBackground = provider.noUpdateSessions
		? fakeUserSessionBackgroundUpdater
		: realUserSessionBackgroundUpdater;

	switch (provider.auth) {
		case AuthScope.None:
			handler = async (req, res, timer) => await provider.handleRequest({ req, res, timer });
			break;

		case AuthScope.TokenOnly:
			handler = async (req, res, timer) => {
				const token = getToken(req);

				if (token === null) {
					throw new MissingTokenError();
				}

				let session: UserSessionModel;

				{
					using _ = timer.create(getUserSession);

					session = await getUserSession(token);
				}

				updateUserAnalyticsInBackground(session.user_id, req);
				updateUserSessionInBackground(token, req);

				await provider.handleRequest({ req, res, timer, session });
			};
			break;

		case AuthScope.OptionalUser:
			handler = async (req, res, timer) => {
				const token = getToken(req);

				if (token === null) {
					await provider.handleRequest({ req, res, timer, session: null, user: null });
					return;
				}

				let session: UserSessionModel;
				let user: UserModel;

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
			handler = async (req, res, timer) => {
				const token = getToken(req);

				if (token === null) {
					throw new MissingTokenError();
				}

				let session: UserSessionModel;
				let user: UserModel;

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
		handler(req, res, new ServerTimer()).catch((error: unknown) => next(error));
	});
}
