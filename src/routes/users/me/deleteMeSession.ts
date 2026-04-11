import { ForbiddenError } from "@/errors/ForbiddenError";
import { pg } from "@/global/pg";
import { USER_SESSION_ID, type UserSessionId } from "@/shared/types/UserSession";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";

export const deleteMeSession: Endpoint<void, void, { id: UserSessionId }> = {
    auth: AuthScope.Session,
    method: "delete",
    path: "/users/@me/sessions/:id",
    description: "Deletes a specific session of the current user.",
    returns: "Success, no content.",
    tags: ["Me", "Users"],
    flags: EndpointFlags.NoContent | EndpointFlags.May403,
    requestBody: null,
    responseBody: null,
    pathParams: makeParams({ id: USER_SESSION_ID }),
    queryParams: null,
    async handleRequest({ req, timer, session }) {
        if (req.params.id === session.id) {
            throw new ForbiddenError({
                title: "Not Allowed",
                description: "You can only delete your current session by logging out.",
            });
        }

        using _ = timer.create("deleteSession");

        try {
            await pg<[]>`
                DELETE FROM user_sessions
                WHERE id = ${req.params.id} AND user_id = ${session.userId}
            `;
        } catch (error) {
            throw wrapPgError(error);
        }
    },
};
