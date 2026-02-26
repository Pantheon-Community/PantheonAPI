import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";
import type { DiscordAuth } from "@/types/Discord";

export async function createSession(
	authData: DiscordAuth,
	id: DiscordId,
	ip: string,
	userAgent: string,
): Promise<void> {
	const expiresAt = new Date(Date.now() + authData.expires_in * 1000).toISOString();

	await pg`
        INSERT INTO sessions (
            access_token,
            refresh_token,
            expires_at,
            user_id,
            ip,
            user_agent
        ) VALUES (
            ${authData.access_token},
            ${authData.refresh_token},
            ${expiresAt},
            ${id},
            ${ip},
            ${userAgent}
        )
    `;
}
