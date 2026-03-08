import { setUserSteam } from "@/databases/users/setUserSteam";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const deleteMeSteamUsersPrimary: Endpoint = {
    auth: AuthScope.TokenOnly,
    method: "delete",
    path: "/users/@me/steam-users/primary",
    async handleRequest({ res, timer, session }) {
        {
            using _ = timer.create(setUserSteam);

            await setUserSteam(session.userId, null);
        }

        timer.addTo(res).sendStatus(200);
    },
};
