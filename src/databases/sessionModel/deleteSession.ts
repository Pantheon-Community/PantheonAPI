import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/types/Common";

export async function deleteSession(token: UserToken): Promise<void> {
	await pg`DELETE FROM sessions WHERE access_token = ${token}`;
}
