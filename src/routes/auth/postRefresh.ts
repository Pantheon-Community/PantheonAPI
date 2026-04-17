import { pg } from "@/global/pg";
import type { UserSessionModel } from "@/models/UserSessionModel";
import { refreshAccessToken } from "@/other/discord/auth/refreshAccessToken";
import { getUserRoleIds } from "@/services/getUserRoleIds";
import { userService } from "@/services/userService";
import type { DiscordId } from "@/shared/types/Common";
import type { Fingerprint } from "@/shared/types/Fingerprint";
import { AUTH_RESPONSE, type AuthResponse } from "@/shared/types/Responses/AuthResponse";
import type { UserSessionId } from "@/shared/types/UserSession";
import type { DiscordAuthData } from "@/types/Discord";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

export const postRefresh: Endpoint<void, AuthResponse> = {
    method: "post",
    path: "/refresh",
    auth: AuthScope.Session,
    description: "Refreshes an existing Discord OAuth2 session.",
    returns: "User data and a token for making elevated requests to the API.",
    source: import.meta.path,
    flags: EndpointFlags.MakesSecondaryRequests,
    requestBody: null,
    responseBody: AUTH_RESPONSE,
    pathParams: null,
    queryParams: null,
    async handleRequest({ timer, fingerprint, session }) {
        // 1. refresh Discord login

        const authData = await refreshAccessToken(session.refreshToken, timer);

        const token = authData.accessToken;

        // 2. refetch Discord and Steam data

        const { user, steamUsers } = await userService(token, fingerprint, timer);

        // 3. replace existing session and get roles

        const [sessionId, roleIds] = await Promise.all([
            replaceSession(session.userId, session.id, authData, fingerprint, timer),
            getUserRoleIds(user.id, timer),
        ]);

        // 4. done!

        const expiresAt = authData.expiresAt.toISOString();

        return { user, steamUsers, expiresAt, token, sessionId, roleIds };
    },
};

type DeletedSession = Pick<UserSessionModel, "started_at" | "times_refreshed" | "action_count">;

async function deleteOldSession(
    sessionId: UserSessionId,
    timer: ServerTimer,
): Promise<DeletedSession> {
    using _ = timer.create("deleteOldSession");

    try {
        const [session] = await pg<DeletedSession[]>`
            DELETE FROM user_sessions
            WHERE id = ${sessionId}
            RETURNING started_at, times_refreshed, action_count
        `;

        if (session === undefined) {
            // Very rare, but technically possible; the session was deleted after the endpoint was
            // called, but before this deletion logic was. No reason to fail, just use sensible
            // fallback data.
            return { started_at: new Date(), times_refreshed: 0, action_count: 0 };
        }

        return session;
    } catch (error) {
        throw wrapPgError(error);
    }
}

async function createNewSession(
    userId: DiscordId,
    authData: DiscordAuthData,
    fingerprint: Fingerprint,
    previousSession: DeletedSession,
    timer: ServerTimer,
): Promise<UserSessionId> {
    using _ = timer.create("createNewSession");

    const { accessToken, refreshToken, expiresAt } = authData;

    const { started_at, times_refreshed, action_count } = previousSession;

    const insert: Partial<UserSessionModel> = {
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        started_at,
        expires_at: expiresAt,
        times_refreshed: times_refreshed + 1,
        action_count,
    };

    const { ip, userAgent, origin } = fingerprint;

    if (ip) insert.ip = ip;
    if (userAgent) insert.user_agent = userAgent;
    if (origin) insert.origin = origin;

    try {
        const [session] = await pg<[Pick<UserSessionModel, "id">]>`
            INSERT INTO user_sessions ${sql(insert)}
            RETURNING id
        `;

        return castNumber(session.id);
    } catch (error) {
        throw wrapPgError(error);
    }
}

async function replaceSession(
    userId: DiscordId,
    sessionId: UserSessionId,
    authData: DiscordAuthData,
    fingerprint: Fingerprint,
    timer: ServerTimer,
): Promise<UserSessionId> {
    const previousSession = await deleteOldSession(sessionId, timer);

    return await createNewSession(userId, authData, fingerprint, previousSession, timer);
}
