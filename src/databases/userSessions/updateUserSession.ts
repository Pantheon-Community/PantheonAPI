import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/types/Common";
import type { RequestAnalytics } from "@/types/RequestAnalytics";
import { wrapPgError } from "../utils/handlePgError";

export async function updateUserSession(
    token: UserToken,
    analytics: RequestAnalytics,
): Promise<void> {
    const { ip, userAgent, origin } = analytics;

    try {
        await pg`
            UPDATE user_sessions SET
                ip = ${ip},
                user_agent = ${userAgent},
                origin = ${origin},
                last_action_at = NOW()
            WHERE access_token = ${token}
        `;
    } catch (error) {
        throw wrapPgError(error);
    }
}
