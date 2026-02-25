import { ExpiredTokenError, InvalidTokenError } from "@/errors/UnauthorizedError";
import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/types/Common";
import type { User } from "@/shared/types/User";
import { convertToUser, type UserModel } from "../userModel/base/UserModel";
import type { SessionModel } from "./base/SessionModel";

interface SessionAndUser {
	session: SessionModel;

	user: User;
}

export async function getSessionAndUser(token: UserToken): Promise<SessionAndUser> {
	const result = await pg<(SessionModel & UserModel)[]>`
        SELECT * FROM sessions s JOIN users u ON s.user_id = u.id WHERE access_token = ${token}
    `;

	if (result.length === 0) {
		throw new InvalidTokenError();
	}

	if (result[0].expires_at.getTime() < Date.now()) {
		throw new ExpiredTokenError();
	}

	return { session: result[0], user: convertToUser(result[0]) };
}
