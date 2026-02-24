import type { NextFunction, Request, Response } from "express";
import { getSession } from "@/databases/sessionModel/getSession";
import { getSessionAndUser } from "@/databases/sessionModel/getSessionAndUser";
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

				await provider.handleRequest({ req, res, session: await getSession(token) });
			};
			break;

		case AuthScope.OptionalUser:
			handler = async (req, res) => {
				const token = getToken(req);

				if (token === null) {
					await provider.handleRequest({ req, res, session: null, user: null });
				} else {
					await provider.handleRequest({ req, res, ...(await getSessionAndUser(token)) });
				}
			};
			break;

		case AuthScope.User:
			handler = async (req, res) => {
				const token = getToken(req);

				if (token === null) {
					throw new MissingTokenError();
				}

				await provider.handleRequest({ req, res, ...(await getSessionAndUser(token)) });
			};
			break;

		default:
			throw new Error(`Provider for ${AuthScope[provider.auth]} auth not implemented yet`);
	}

	app[provider.method](provider.path, (req, res, next) => {
		handler(req, res, next).catch((error: unknown) => next(error));
	});
}
