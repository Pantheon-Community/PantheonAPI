import { replaceUserSession } from "@/databases/userSessions/replaceUserSession";
import { upsertUser } from "@/databases/users/upsertUser";
import { refreshAccessToken } from "@/discord/auth/refreshAccessToken";
import { fetchMe } from "@/discord/main/fetchMe";
import { steamConnectionUsersService } from "@/services/steamConnectionUsersService";
import type { UserSessionId } from "@/shared/types/Common";
import type { AuthResponse } from "@/shared/types/Responses/AuthResponse";
import type { SteamUserBasicWithTimes } from "@/shared/types/SteamUser";
import type { UserBasicWithSteam } from "@/shared/types/User";
import type { DiscordAuthData, DiscordUser } from "@/types/Discord";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { getAnalytics } from "@/utils/getAnalytics";

export const postRefresh: Endpoint<void, AuthResponse> = {
    method: "post",
    path: "/refresh",
    auth: AuthScope.TokenOnly,
    noUpdateSessions: true,
    async handleRequest({ req, res, timer, session }) {
        // 1. refresh Discord login

        let authData: DiscordAuthData;

        {
            using _ = timer.create(refreshAccessToken);

            authData = await refreshAccessToken(session.refreshToken);
        }

        // 2. refetch Discord data

        let discordUser: DiscordUser;
        let steamUsers: SteamUserBasicWithTimes[];

        {
            using _ = timer.create(fetch, steamConnectionUsersService);

            const result = await Promise.all([
                fetchMe(authData.accessToken),
                steamConnectionUsersService(authData.accessToken),
            ]);

            discordUser = result[0];
            steamUsers = result[1];
        }

        // 3. upsert user and replace existing session

        let user: UserBasicWithSteam;
        let sessionId: UserSessionId;

        const analytics = getAnalytics(req);

        {
            using _ = timer.create(upsertUser, replaceUserSession);

            const result = await Promise.all([
                upsertUser(discordUser, steamUsers.at(0) ?? null, analytics),
                replaceUserSession(session.accessToken, authData, analytics),
            ]);

            user = result[0];
            sessionId = result[1];
        }

        // done!

        timer.addTo(res).status(200).json({
            user,
            steamUsers,
            expiresAt: authData.expiresAt.toISOString(),
            token: authData.accessToken,
            sessionId,
        });
    },
};
