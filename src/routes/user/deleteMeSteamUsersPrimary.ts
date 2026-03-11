import { setUserSteam } from "@/databases/users/setUserSteam";
import { RequestMethod } from "@/shared/types/RequestMethod";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const deleteMeSteamUsersPrimary: Endpoint = {
    auth: AuthScope.Session,
    method: RequestMethod.Delete,
    path: "/users/@me/steam-users/primary",
    async handleRequest({ timer, session }) {
        await setUserSteam(session.userId, null, timer);
    },
};
