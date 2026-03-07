import { InvalidTokenError } from "@/errors/UnauthorizedError";
import { pg } from "@/global/pg";
import type { UserSessionId, UserToken } from "@/shared/types/Common";
import type { DiscordAuthData } from "@/types/Discord";
import type { RequestAnalytics } from "@/types/RequestAnalytics";
import { wrapPgError } from "../utils/handlePgError";
import type { UserSessionModel } from "./userSessionModel";

type DeleteQuery = Pick<
    UserSessionModel,
    "started_at" | "times_refreshed" | "user_id" | "action_count"
>;

type InsertQuery = Pick<UserSessionModel, "id">;

export async function replaceUserSession(
    oldSessionToken: UserToken,
    authData: DiscordAuthData,
    analytics: RequestAnalytics,
): Promise<UserSessionId> {
    const { accessToken, refreshToken, expiresAt } = authData;
    const { ip, userAgent, origin } = analytics;

    try {
        const deletedSessions = await pg<DeleteQuery[]>`
            DELETE FROM user_sessions
            WHERE access_token = ${oldSessionToken}
            RETURNING started_at, times_refreshed, user_id, action_count
        `;

        if (deletedSessions.length === 0) {
            throw new InvalidTokenError();
        }

        const { started_at, times_refreshed, user_id, action_count } = deletedSessions[0];

        const [createdSession] = await pg<[InsertQuery]>`
            INSERT INTO user_sessions (
                access_token,
                refresh_token,
                started_at,
                expires_at,
                times_refreshed,
                user_id,
                ip,
                user_agent,
                origin,
                action_count
            ) VALUES (
                ${accessToken},
                ${refreshToken},
                ${started_at},
                ${expiresAt},
                ${times_refreshed + 1},
                ${user_id},
                ${ip},
                ${userAgent},
                ${origin},
                ${action_count}
            ) RETURNING id
        `;

        return createdSession.id;
    } catch (error) {
        throw wrapPgError(error);
    }
}
