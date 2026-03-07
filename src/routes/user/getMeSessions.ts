import { getUserSessionsByUserId } from "@/databases/userSessions/getUserSessionsByUserId";
import type { UserSessionBasic } from "@/shared/types/UserSession";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const getMeSessions: Endpoint<void, UserSessionBasic[]> = {
    method: "get",
    path: "/users/@me/sessions",
    auth: AuthScope.TokenOnly,
    async handleRequest({ res, timer, session }) {
        let sessions: UserSessionBasic[];

        {
            using _ = timer.create(getUserSessionsByUserId);

            sessions = await getUserSessionsByUserId(session.userId);
        }

        timer.addTo(res).status(200).json(sessions);
    },
};
