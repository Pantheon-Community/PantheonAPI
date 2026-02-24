import { pg } from "@/global/pg";

export async function deleteExpiredSessions(): Promise<void> {
	await pg`DELETE FROM sessions WHERE expires_at < NOW()`;
}
