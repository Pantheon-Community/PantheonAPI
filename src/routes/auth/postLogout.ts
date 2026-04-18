import { pg } from "@/global/pg";
import { revokeAccessToken } from "@/other/discord/auth/revokeAccessToken";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";

export const postLogout: Endpoint = {
    method: "post",
    path: "/logout",
    auth: AuthScope.Session,
    description: "Ends an existing Discord OAuth2 session.",
    returns: "Success, no content.",
    source: import.meta.path,
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

        using _ = timer.create("deleteSession");

        await pg`DELETE FROM user_sessions WHERE id = ${session.id}`;
    },
};
