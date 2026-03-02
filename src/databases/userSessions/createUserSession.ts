import { pg } from "@/global/pg";
import type { DiscordId, Ip, UserAgent } from "@/shared/types/Common";
import type { DiscordAuthData } from "@/types/Discord";
import { wrapPgError } from "../utils/handlePgError";

export async function createUserSession(
	authData: DiscordAuthData,
	id: DiscordId,
	ip: Ip,
	userAgent: UserAgent,
): Promise<void> {
	try {
		await pg`
            INSERT INTO user_sessions (
                access_token,
                refresh_token,
                expires_at,
                user_id,
                ip,
                user_agent
            ) VALUES (
                ${authData.accessToken},
                ${authData.refreshToken},
                ${authData.expiresAt},
                ${id},
                ${ip},
                ${userAgent}
            )
        `;
	} catch (error) {
		throw wrapPgError(error);
	}
}
