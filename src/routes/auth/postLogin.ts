import { config } from "@/global/config";
import { pg } from "@/global/pg";
import type { UserSessionModel } from "@/models/UserSessionModel";
import { requestAccessToken } from "@/other/discord/auth/requestAccessToken";
import { getUserRoleIds } from "@/services/getUserRoleIds";
import { userService } from "@/services/userService";
import type { DiscordId } from "@/shared/types/Common";
import type { Fingerprint } from "@/shared/types/Fingerprint";
import { LOGIN_REQUEST, type LoginRequest } from "@/shared/types/Requests/LoginRequest";
import { AUTH_RESPONSE, type AuthResponse } from "@/shared/types/Responses/AuthResponse";
import type { UserSessionId } from "@/shared/types/UserSession";
import type { DiscordAuthData } from "@/types/Discord";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { castNumber } from "@/utils/castNumber";
import { getFingerprint } from "@/utils/getFingerprint";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

export const postLogin: Endpoint<LoginRequest, AuthResponse> = {
    method: "post",
    path: "/login",
    auth: AuthScope.None,
    description: "Completes the Discord OAuth2 login flow.",
    returns: "User data and a token for making elevated requests to the API.",
    source: import.meta.path,
    flags: EndpointFlags.MakesSecondaryRequests,
    requestBody: LOGIN_REQUEST,
    responseBody: AUTH_RESPONSE,
    pathParams: null,
    queryParams: null,
    async handleRequest({ req, timer }) {
        const { code, redirectUri } = req.body;

        // 1. login to Discord

        const authData = await requestAccessToken(code, redirectUri, timer);

        const token = authData.accessToken;

        // 2. fetch Discord and Steam data

        const fingerprint = getFingerprint(req);

        const { user, steamUsers } = await userService(token, fingerprint, timer);

        // 3. create new session and get roles

        const [sessionId, roleIds] = await Promise.all([
            createNewSession(user.id, authData, fingerprint, timer),
            getUserRoleIds(user.id, timer),
        ]);

        // 4. done!

        const expiresAt = authData.expiresAt.toISOString();

        return { user, steamUsers, expiresAt, token, sessionId, roleIds };
    },
};

async function createNewSession(
    userId: DiscordId,
    authData: DiscordAuthData,
    fingerprint: Fingerprint,
    timer: ServerTimer,
): Promise<UserSessionId> {
    using _ = timer.create("createNewSession");

    const { accessToken, refreshToken, expiresAt } = authData;

    const insert: Partial<UserSessionModel> = {
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
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

if (config.environment === "development") {
    // developer QoL

    Object.assign(LOGIN_REQUEST.schema.properties.redirectUri, {
        example: `http://localhost:${config.api.port || 5000}`,
    });
}
