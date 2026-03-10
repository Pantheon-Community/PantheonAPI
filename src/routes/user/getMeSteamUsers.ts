import { steamConnectionService } from "@/services/steamConnectionService";
import type { SteamUserBasicWithTimes } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const getMeSteamUsers: Endpoint<void, SteamUserBasicWithTimes[]> = {
    method: "get",
    path: "/users/@me/steam-users",
    auth: AuthScope.Session,
    async handleRequest({ timer, session }) {
        return await steamConnectionService(session.accessToken, timer);
    },
};
