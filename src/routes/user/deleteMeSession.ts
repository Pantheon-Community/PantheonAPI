import { userSessionsDb } from "@/databases/userSessions";
import { ForbiddenError } from "@/errors/ForbiddenError";
import type { UserSessionId } from "@/shared/types/UserSession";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

interface PathParams {
    id: UserSessionId;
}

/** Deletes a specific sessions of the currently logged-in user. */
export const deleteMeSession: Endpoint<void, void, PathParams> = {
    auth: AuthScope.Session,
    method: "delete",
    path: "/users/@me/sessions/:id",
    async handleRequest({ req, timer, session }) {
        if (req.params.id === session.id) {
            throw new ForbiddenError({
                title: "Not Allowed",
                description: "You can only delete your current session by logging out.",
            });
        }

        await userSessionsDb.deleteOwnSession(req.params.id, session.userId, timer);
    },
};
