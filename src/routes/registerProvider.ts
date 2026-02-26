import type { Request, Response } from "express";
import { getSession } from "@/databases/sessionModel/getSession";
import { getSessionAndUser } from "@/databases/sessionModel/getSessionAndUser";
import { updateUserLastSeenAt } from "@/databases/userModel/updateUserLastSeenAt";
import { MissingTokenError } from "@/errors/UnauthorizedError";
import { app } from "@/global/app";
import type { UserToken } from "@/shared/types/Common";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";
import { getIp } from "@/utils/getIp";
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

// biome-ignore lint/suspicious/noExplicitAny: unknown just doesn't work as a default here
export function registerProvider(provider: EndpointProvider<any, any, any, any>): void {
	let handler: (req: Request, res: Response, timer: ServerTimer) => Promise<void>;

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

				const session = await getSession(token);

				timer.finished(getSession);

				updateUserLastSeenAt(session.user_id, getIp(req));

				await provider.handleRequest({ req, res, timer, session });
			};
			break;

		case AuthScope.OptionalUser:
			handler = async (req, res, timer) => {
				const token = getToken(req);

				if (token === null) {
					await provider.handleRequest({ req, res, timer, session: null, user: null });
				} else {
					const sessionAndUser = await getSessionAndUser(token);

					timer.finished(getSessionAndUser);

					updateUserLastSeenAt(sessionAndUser.user.id, getIp(req));

					await provider.handleRequest({ req, res, timer, ...sessionAndUser });
				}
			};
			break;

		case AuthScope.User:
			handler = async (req, res, timer) => {
				const token = getToken(req);

				if (token === null) {
					throw new MissingTokenError();
				}

				const sessionAndUser = await getSessionAndUser(token);

				timer.finished(getSessionAndUser);

				updateUserLastSeenAt(sessionAndUser.user.id, getIp(req));

				await provider.handleRequest({ req, res, timer, ...sessionAndUser });
			};
			break;

		default:
			throw new Error(`Provider for ${AuthScope[provider.auth]} auth not implemented yet`);
	}

	app[provider.method](provider.path, (req, res, next) => {
		handler(req, res, new ServerTimer()).catch((error: unknown) => next(error));
	});
}
