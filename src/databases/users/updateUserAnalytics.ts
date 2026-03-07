import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";
import type { RequestAnalytics } from "@/types/RequestAnalytics";
import { wrapPgError } from "../utils/handlePgError";

export async function updateUserAnalytics(
    id: DiscordId,
    analytics: RequestAnalytics,
): Promise<void> {
    const { ip, userAgent, origin } = analytics;

    try {
        await pg`
            UPDATE users SET
                last_seen_at = NOW(),
                ip = ${ip},
                user_agent = ${userAgent},
                origin = ${origin},
                lifetime_action_count = lifetime_action_count + 1
            WHERE id = ${id}
        `;
    } catch (error) {
        throw wrapPgError(error);
    }
}
