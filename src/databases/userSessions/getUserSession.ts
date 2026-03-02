import { ExpiredTokenError, InvalidTokenError } from "@/errors/UnauthorizedError";
import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/types/Common";
import { wrapPgError } from "../utils/handlePgError";
import type { UserSessionModel } from "./model/userSessionsModel";

export async function getUserSession(token: UserToken): Promise<UserSessionModel> {
	let result: UserSessionModel[];

	try {
		result = await pg`SELECT * FROM user_sessions WHERE access_token = ${token}`;
	} catch (error) {
		throw wrapPgError(error);
	}

	if (result.length === 0) {
		throw new InvalidTokenError();
	}

	if (result[0].expires_at.getTime() < Date.now()) {
		throw new ExpiredTokenError();
	}

	return result[0];
}
