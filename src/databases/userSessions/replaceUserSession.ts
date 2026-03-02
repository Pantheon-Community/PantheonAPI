import { pg } from "@/global/pg";
import type { Ip, UserAgent } from "@/shared/types/Common";
import type { DiscordAuthData } from "@/types/Discord";
import { wrapPgError } from "../utils/handlePgError";
import { deleteUserSession } from "./deleteUserSession";
import type { UserSessionModel } from "./model/userSessionsModel";

export async function replaceUserSession(
	oldSession: UserSessionModel,
	authData: DiscordAuthData,
	ip: Ip,
	userAgent: UserAgent,
): Promise<void> {
	await deleteUserSession(oldSession.access_token);

	try {
		await pg`
            INSERT INTO user_sessions (
                access_token,
                refresh_token,
                started_at,
                expires_at,
                times_refreshed,
                user_id,
                ip,
                user_agent,
                action_count
            ) VALUES (
                ${authData.accessToken},
                ${authData.refreshToken},
                ${oldSession.started_at},
                ${authData.expiresAt},
                ${oldSession.times_refreshed + 1},
                ${oldSession.user_id},
                ${ip},
                ${userAgent},
                ${oldSession.action_count}
            )
        `;
	} catch (error) {
		throw wrapPgError(error);
	}
}
