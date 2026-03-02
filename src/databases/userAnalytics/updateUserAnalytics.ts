import { pg } from "@/global/pg";
import type { DiscordId, Ip, UserAgent } from "@/shared/types/Common";
import { wrapPgError } from "../utils/handlePgError";

export async function updateUserAnalytics(
	id: DiscordId,
	ip: Ip,
	userAgent: UserAgent,
): Promise<void> {
	try {
		await pg`
            UPDATE user_analytics SET
                last_seen_at = NOW(),
                ip = ${ip},
                user_agent = ${userAgent},
                lifetime_action_count = user_analytics.lifetime_action_count + 1
            WHERE id = ${id}
        `;
	} catch (error) {
		throw wrapPgError(error);
	}
}
