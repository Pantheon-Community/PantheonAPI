import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/types/Common";
import { wrapPgError } from "../utils/handlePgError";

export async function deleteUserSession(token: UserToken): Promise<void> {
	try {
		await pg`DELETE FROM user_sessions WHERE access_token = ${token}`;
	} catch (error) {
		throw wrapPgError(error);
	}
}
