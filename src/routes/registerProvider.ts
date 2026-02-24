import type { NextFunction, Request, Response } from "express";
import { getSession } from "@/databases/sessionModel/getSession";
import { getSessionAndUser } from "@/databases/sessionModel/getSessionAndUser";
import { updateUserLastSeenAt } from "@/databases/userModel/updateUserLastSeenAt";
import { MissingTokenError } from "@/errors/UnauthorizedError";
import { app } from "@/global/app";
import type { UserToken } from "@/shared/Common";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

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

// biome-ignore lint/suspicious/noExplicitAny: unknown just doesn't work as a default here
export function registerProvider(provider: EndpointProvider<any, any, any, any>): void {
	let handler: (req: Request, res: Response, next: NextFunction) => Promise<void>;

	switch (provider.auth) {
		case AuthScope.None:
			handler = async (req, res) => await provider.handleRequest({ req, res });
			break;

		case AuthScope.TokenOnly:
			handler = async (req, res) => {
				const token = getToken(req);

				if (token === null) {
					throw new MissingTokenError();
				}

				const session = await getSession(token);

				updateUserLastSeenAt(session.user_id);

				await provider.handleRequest({ req, res, session });
			};
			break;

		case AuthScope.OptionalUser:
			handler = async (req, res) => {
				const token = getToken(req);

				if (token === null) {
					await provider.handleRequest({ req, res, session: null, user: null });
				} else {
					const sessionAndUser = await getSessionAndUser(token);

					updateUserLastSeenAt(sessionAndUser.user.id);

					await provider.handleRequest({ req, res, ...sessionAndUser });
				}
			};
			break;

		case AuthScope.User:
			handler = async (req, res) => {
				const token = getToken(req);

				if (token === null) {
					throw new MissingTokenError();
				}

				const sessionAndUser = await getSessionAndUser(token);

				updateUserLastSeenAt(sessionAndUser.user.id);

				await provider.handleRequest({ req, res, ...sessionAndUser });
			};
			break;

		default:
			throw new Error(`Provider for ${AuthScope[provider.auth]} auth not implemented yet`);
	}

	app[provider.method](provider.path, (req, res, next) => {
		handler(req, res, next).catch((error: unknown) => next(error));
	});
}
