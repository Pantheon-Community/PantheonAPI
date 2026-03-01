import { pg } from "@/global/pg";
import type { DiscordId, Ip, UserAgent } from "@/shared/types/Common";

export async function upsertUserAnalytics(
	id: DiscordId,
	ip: Ip,
	userAgent: UserAgent,
): Promise<void> {
	await pg`
        INSERT INTO user_analytics (id, ip, user_agent)
        VALUES (${id}, ${ip}, ${userAgent})
        ON CONFLICT (id) DO UPDATE SET
            last_seen_at = NOW(),
            ip = ${ip},
            user_agent = ${userAgent},
            lifetime_action_count = user_analytics.lifetime_action_count + 1
    `;
}
