import { userRolesDb } from "@/databases/userRoles";
import { userSessionsDb } from "@/databases/userSessions";
import { refreshAccessToken } from "@/other/discord/auth/refreshAccessToken";
import { userService } from "@/services/userService";
import type { AuthResponse } from "@/shared/types/Responses/AuthResponse";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Refreshes an existing Discord OAuth2 session. */
export const postRefresh: Endpoint<void, AuthResponse> = {
    method: "post",
    path: "/refresh",
    auth: AuthScope.Session,
    skipSessionUpdates: true,
    async handleRequest({ timer, session, analytics }) {
        // 1. refresh Discord login

        const authData = await refreshAccessToken(session.refreshToken, timer);

        const token = authData.accessToken;

        // 2. refetch Discord and Steam data

        const { user, steamUsers } = await userService(token, analytics, timer);

        // 3. replace existing session

        const [sessionId, roleIds] = await Promise.all([
            userSessionsDb.replaceSession(session.id, authData, analytics, timer),
            userRolesDb.getUserRoleIds(user.id, timer),
        ]);

        // 4. done!

        const expiresAt = authData.expiresAt.toISOString();

        return { user, steamUsers, expiresAt, token, sessionId, roleIds };
    },
};
