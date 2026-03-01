import { ExpiredTokenError, InvalidTokenError } from "@/errors/UnauthorizedError";
import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/types/Common";
import type { UserSessionModel } from "./model/userSessionsModel";

export async function getUserSession(token: UserToken): Promise<UserSessionModel> {
	const result = await pg<UserSessionModel[]>`
        SELECT * FROM user_sessions WHERE access_token = ${token}
    `;

	if (result.length === 0) {
		throw new InvalidTokenError();
	}

	if (result[0].expires_at.getTime() < Date.now()) {
		throw new ExpiredTokenError();
	}

	return result[0];
}
