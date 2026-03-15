import { getUserRoleIds } from "@/databases/userRoles/getUserRoleIds";
import { createMySession } from "@/databases/userSessions/self/createMySession";
import { requestAccessToken } from "@/other/discord/auth/requestAccessToken";
import { userService } from "@/services/userService";
import type { LoginRequest } from "@/shared/types/Requests/LoginRequest";
import type { AuthResponse } from "@/shared/types/Responses/AuthResponse";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { getAnalytics } from "@/utils/getAnalytics";

export const postLogin: Endpoint<LoginRequest, AuthResponse> = {
    method: "post",
    path: "/login",
    auth: AuthScope.None,
    async handleRequest({ req, timer }) {
        const { code, redirectUri } = req.body;

        // 1. login to Discord

        const authData = await requestAccessToken(code, redirectUri, timer);

        const token = authData.accessToken;

        // 2. fetch Discord and Steam data

        const analytics = getAnalytics(req);

        const { user, steamUsers } = await userService(token, analytics, timer);

        // 3. create new session

        const [sessionId, roleIds] = await Promise.all([
            createMySession(authData, user.id, analytics, timer),
            getUserRoleIds(user.id, timer),
        ]);

        // 4. done!

        const expiresAt = authData.expiresAt.toISOString();

        return { user, steamUsers, expiresAt, token, sessionId, roleIds };
    },
};
