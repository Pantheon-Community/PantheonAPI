import { setUserSteam } from "@/databases/users/setUserSteam";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const deleteMeSteamUsersPrimary: Endpoint = {
    auth: AuthScope.Session,
    method: "delete",
    path: "/users/@me/steam-users/primary",
    async handleRequest({ timer, session }) {
        await setUserSteam(session.userId, null, timer);
    },
};
