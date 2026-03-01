import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/types/Common";

export async function deleteUserSession(token: UserToken): Promise<void> {
	await pg`DELETE FROM user_sessions WHERE access_token = ${token}`;
}
