import { pg } from "@/global/pg";
import type { DiscordId, UserSessionId } from "@/shared/types/Common";
import type { DiscordAuthData } from "@/types/Discord";
import type { RequestAnalytics } from "@/types/RequestAnalytics";
import { wrapPgError } from "../utils/handlePgError";
import type { UserSessionModel } from "./userSessionModel";

type InsertQuery = Pick<UserSessionModel, "id">;

export async function createUserSession(
    authData: DiscordAuthData,
    id: DiscordId,
    analytics: RequestAnalytics,
): Promise<UserSessionId> {
    const { accessToken, refreshToken, expiresAt } = authData;
    const { ip, userAgent, origin } = analytics;

    try {
        const [createdSession] = await pg<[InsertQuery]>`
            INSERT INTO user_sessions (
                access_token,
                refresh_token,
                expires_at,
                user_id,
                ip,
                user_agent,
                origin
            ) VALUES (
                ${accessToken},
                ${refreshToken},
                ${expiresAt},
                ${id},
                ${ip},
                ${userAgent},
                ${origin}
            ) RETURNING id
        `;

        return createdSession.id;
    } catch (error) {
        throw wrapPgError(error);
    }
}
