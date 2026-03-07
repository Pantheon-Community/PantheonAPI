import { upsertUser } from "@/databases/users/upsertUser";
import { fetchMe } from "@/discord/main/fetchMe";
import { steamConnectionUsersService } from "@/services/steamConnectionUsersService";
import type { GetMeResponse } from "@/shared/types/Responses/GetMeResponse";
import type { SteamUserBasicWithTimes } from "@/shared/types/SteamUser";
import type { UserBasicWithSteam } from "@/shared/types/User";
import type { DiscordUser } from "@/types/Discord";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { getAnalytics } from "@/utils/getAnalytics";

export const getMe: Endpoint<void, GetMeResponse> = {
    method: "get",
    path: "/users/@me",
    auth: AuthScope.TokenOnly,
    async handleRequest({ req, res, timer, session }) {
        let discordUser: DiscordUser;
        let steamUsers: SteamUserBasicWithTimes[];

        {
            using _ = timer.create(fetchMe, steamConnectionUsersService);

            const result = await Promise.all([
                fetchMe(session.accessToken),
                steamConnectionUsersService(session.accessToken),
            ]);

            discordUser = result[0];
            steamUsers = result[1];
        }

        let user: UserBasicWithSteam;

        {
            using _ = timer.create(upsertUser);

            user = await upsertUser(discordUser, steamUsers.at(0) ?? null, getAnalytics(req));
        }

        timer.addTo(res).status(200).json({ user, steamUsers });
    },
};
