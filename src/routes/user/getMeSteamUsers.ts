import { steamConnectionUsersService } from "@/services/steamConnectionUsersService";
import type { SteamUserBasicWithTimes } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const getMeSteamUsers: Endpoint<void, SteamUserBasicWithTimes[]> = {
    method: "get",
    path: "/users/@me/steam-users",
    auth: AuthScope.TokenOnly,
    async handleRequest({ res, timer, session }) {
        let steamUsers: SteamUserBasicWithTimes[];

        {
            using _ = timer.create(steamConnectionUsersService);

            steamUsers = await steamConnectionUsersService(session.accessToken);
        }

        timer.addTo(res).status(200).json(steamUsers);
    },
};
