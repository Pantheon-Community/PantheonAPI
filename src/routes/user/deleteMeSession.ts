import { deleteOneOfMySessions } from "@/databases/userSessions/self/deleteOneOfMySessions";
import { ForbiddenError } from "@/errors/ForbiddenError";
import type { UserSessionId } from "@/shared/types/Common";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

interface PathParams {
    id: UserSessionId;
}

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

        await deleteOneOfMySessions(session.userId, req.params.id, timer);
    },
};
