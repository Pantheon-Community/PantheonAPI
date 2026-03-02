import { pg } from "@/global/pg";
import type { Ip, UserAgent, UserToken } from "@/shared/types/Common";
import { wrapPgError } from "../utils/handlePgError";

export async function updateUserSession(
	token: UserToken,
	ip: Ip,
	userAgent: UserAgent,
): Promise<void> {
	try {
		await pg`
            UPDATE user_sessions SET
                ip = ${ip},
                user_agent = ${userAgent},
                last_action_at = NOW()
            WHERE access_token = ${token}
        `;
	} catch (error) {
		throw wrapPgError(error);
	}
}
