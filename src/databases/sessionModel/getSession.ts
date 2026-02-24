import { InvalidTokenError } from "@/errors/UnauthorizedError";
import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/Common";
import type { SessionModel } from "./base/SessionModel";

export async function getSession(token: UserToken): Promise<SessionModel> {
	const result = await pg<SessionModel[]>`SELECT * FROM sessions WHERE access_token = ${token}`;

	if (result.length === 0) {
		throw new InvalidTokenError();
	}

	return result[0];
}
