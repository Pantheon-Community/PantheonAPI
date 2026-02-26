import { pg } from "@/global/pg";
import type { DiscordAuth } from "@/types/Discord";
import type { SessionModel } from "./base/SessionModel";
import { deleteSession } from "./deleteSession";

export async function updateSession(
	oldSession: SessionModel,
	newSession: DiscordAuth,
	ip: string,
	userAgent: string,
): Promise<void> {
	const expiresAt = new Date(Date.now() + newSession.expires_in * 1000).toISOString();

	await Promise.all([
		deleteSession(oldSession.access_token),
		pg`
            INSERT INTO sessions (
                access_token,
                refresh_token,
                started_at,
                expires_at,
                times_refreshed,
                user_id,
                ip,
                user_agent
            ) VALUES (
                ${newSession.access_token},
                ${newSession.refresh_token},
                ${oldSession.started_at},
                ${expiresAt},
                ${oldSession.times_refreshed + 1},
                ${oldSession.user_id},
                ${ip},
                ${userAgent}
            )
        `,
	]);
}
