import { pg } from "@/global/pg";

export async function deleteExpiredUserSessions(): Promise<number> {
	const result = await pg`DELETE FROM user_sessions WHERE expires_at < NOW()`;

	return result.count;
}
