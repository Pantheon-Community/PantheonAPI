import { pg } from "@/global/pg";
import type { DiscordId, UserSessionId } from "@/shared/types/Common";
import type { DiscordAuthData } from "@/types/Discord";
import type { RequestAnalytics } from "@/types/RequestAnalytics";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "../../utils/handlePgError";
import type { UserSessionModel } from "../userSessionModel";

type InsertQuery = Pick<UserSessionModel, "id">;

export async function createMySession(
    authData: DiscordAuthData,
    id: DiscordId,
    analytics: RequestAnalytics,
    timer: ServerTimer,
): Promise<UserSessionId> {
    using _ = timer.create("createMySession");

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

        return castNumber(createdSession.id);
    } catch (error) {
        throw wrapPgError(error);
    }
}
