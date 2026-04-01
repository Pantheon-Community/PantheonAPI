import { userSessionsDb } from "@/databases/userSessions";
import type { UserSessionBasic } from "@/shared/types/UserSession";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Returns all non-expired sessions of the currently logged-in user. */
export const getMeSessions: Endpoint<void, UserSessionBasic[]> = {
    method: "get",
    path: "/users/@me/sessions",
    auth: AuthScope.Session,
    async handleRequest({ timer, session }) {
        return await userSessionsDb.getAllSessions(session.userId, timer);
    },
};
