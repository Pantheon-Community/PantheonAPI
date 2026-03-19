import { userSessionsDb } from "@/databases/userSessions";
import { revokeAccessToken } from "@/other/discord/auth/revokeAccessToken";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Ends an existing Discord OAuth2 session. */
export const postLogout: Endpoint = {
    method: "post",
    path: "/logout",
    auth: AuthScope.Session,
    skipSessionUpdates: true,
    async handleRequest({ timer, session }) {
        // while there's nothing strictly stoppping these functions being executed in parallel via
        // Promise.all(...), if something were to go wrong with access token revocation it would be
        // best not to delete it from the database

        await revokeAccessToken(session.accessToken, timer);

        await userSessionsDb.deleteSession(session.id, timer);
    },
};
