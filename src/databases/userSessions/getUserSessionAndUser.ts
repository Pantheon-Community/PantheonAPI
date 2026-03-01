import { ExpiredTokenError, InvalidTokenError } from "@/errors/UnauthorizedError";
import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/types/Common";
import type { UserModel } from "../users/model/userModel";
import type { UserSessionModel } from "./model/userSessionsModel";

export interface UserSessionWithUserModel {
	session: UserSessionModel;

	user: UserModel;
}

export async function getUserSessionAndUser(token: UserToken): Promise<UserSessionWithUserModel> {
	// TODO: better shape for this?
	const result = await pg<(UserSessionModel & UserModel)[]>`
        SELECT * FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE access_token = ${token}
    `;

	if (result.length === 0) {
		throw new InvalidTokenError();
	}

	if (result[0].expires_at.getTime() < Date.now()) {
		throw new ExpiredTokenError();
	}

	return { session: result[0], user: result[0] };
}
