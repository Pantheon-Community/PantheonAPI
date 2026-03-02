import { pg } from "@/global/pg";
import { wrapPgError } from "../utils/handlePgError";

export async function deleteExpiredUserSessions(): Promise<number> {
	try {
		const result = await pg`DELETE FROM user_sessions WHERE expires_at < NOW()`;

		return result.count;
	} catch (error) {
		throw wrapPgError(error);
	}
}
