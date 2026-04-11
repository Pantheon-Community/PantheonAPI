import { pg } from "@/global/pg";
import { revokeAccessToken } from "@/other/discord/auth/revokeAccessToken";
import type { UserSessionId } from "@/shared/types/UserSession";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "@/utils/wrapPgError";

export const postLogout: Endpoint = {
    method: "post",
    path: "/logout",
    auth: AuthScope.Session,
    description: "Ends an existing Discord OAuth2 session.",
    returns: "Success, no content.",
    tags: ["Auth"],
    flags: EndpointFlags.NoContent | EndpointFlags.MakesSecondaryRequests,
    requestBody: null,
    responseBody: null,
    pathParams: null,
    queryParams: null,
    async handleRequest({ timer, session }) {
        // While there's nothing strictly stoppping these functions being executed in parallel via
        // Promise.all(...), if something were to go wrong with access token revocation it would be
        // best not to delete it from the database.

        await revokeAccessToken(session.accessToken, timer);

        await deleteSession(session.id, timer);
    },
};

async function deleteSession(sessionId: UserSessionId, timer: ServerTimer): Promise<void> {
    using _ = timer.create("deleteSession");

    try {
        await pg`DELETE FROM user_sessions WHERE id = ${sessionId}`;
    } catch (error) {
        throw wrapPgError(error);
    }
}
