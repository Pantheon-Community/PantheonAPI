import { upsertUser } from "@/databases/users/upsertUser";
import { createUserSession } from "@/databases/userSessions/createUserSession";
import { requestAccessToken } from "@/discord/auth/requestAccessToken";
import { fetchMe } from "@/discord/main/fetchMe";
import { steamConnectionUsersService } from "@/services/steamConnectionUsersService";
import type { UserSessionId } from "@/shared/types/Common";
import type { LoginRequest } from "@/shared/types/Requests/LoginRequest";
import type { AuthResponse } from "@/shared/types/Responses/AuthResponse";
import type { SteamUserBasicWithTimes } from "@/shared/types/SteamUser";
import type { UserBasicWithSteam } from "@/shared/types/User";
import type { DiscordAuthData, DiscordUser } from "@/types/Discord";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { getAnalytics } from "@/utils/getAnalytics";

export const postLogin: Endpoint<LoginRequest, AuthResponse> = {
    method: "post",
    path: "/login",
    auth: AuthScope.None,
    async handleRequest({ req, res, timer }) {
        const { code, redirectUri } = req.body;

        // 1. login to Discord

        let authData: DiscordAuthData;

        {
            using _ = timer.create(requestAccessToken);

            authData = await requestAccessToken(code, redirectUri);
        }

        // 2. fetch Discord data

        let discordUser: DiscordUser;
        let steamUsers: SteamUserBasicWithTimes[];

        {
            using _ = timer.create(fetchMe, steamConnectionUsersService);

            const result = await Promise.all([
                fetchMe(authData.accessToken),
                steamConnectionUsersService(authData.accessToken),
            ]);

            discordUser = result[0];
            steamUsers = result[1];
        }

        // 3. upsert user

        let user: UserBasicWithSteam;

        const analytics = getAnalytics(req);

        {
            using _ = timer.create(upsertUser);

            user = await upsertUser(discordUser, steamUsers.at(0) ?? null, analytics);
        }

        // 4. create new user session

        let sessionId: UserSessionId;

        {
            using _ = timer.create(createUserSession);

            sessionId = await createUserSession(authData, user.id, analytics);
        }

        // 5. done!

        timer.addTo(res).status(200).json({
            user,
            steamUsers,
            expiresAt: authData.expiresAt.toISOString(),
            token: authData.accessToken,
            sessionId,
        });
    },
};
