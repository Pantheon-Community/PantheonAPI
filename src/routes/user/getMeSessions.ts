import { getUserSessionsByUserId } from "@/databases/userSessions/getUserSessionsByUserId";
import { RequestMethod } from "@/shared/types/RequestMethod";
import type { UserSessionBasic } from "@/shared/types/UserSession";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const getMeSessions: Endpoint<void, UserSessionBasic[]> = {
    method: RequestMethod.Get,
    path: "/users/@me/sessions",
    auth: AuthScope.Session,
    async handleRequest({ timer, session }) {
        return await getUserSessionsByUserId(session.userId, timer);
    },
};
