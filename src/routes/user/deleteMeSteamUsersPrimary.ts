import { usersDb } from "@/databases/users";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Clears the primary Steam connection of the currently logged-in user's account. */
export const deleteMeSteamUsersPrimary: Endpoint = {
    auth: AuthScope.Session,
    method: "delete",
    path: "/users/@me/steam-users/primary",
    async handleRequest({ timer, session }) {
        await usersDb.setUserSteam(session.userId, null, timer);
    },
};
