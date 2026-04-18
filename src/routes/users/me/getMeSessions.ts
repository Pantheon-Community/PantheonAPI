import { pg } from "@/global/pg";
import type { UserSessionModel } from "@/models/UserSessionModel";
import { USER_SESSION_BASIC, type UserSessionBasic } from "@/shared/types/UserSession";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { castNumber } from "@/utils/castNumber";
import { makeArray } from "@/utils/specUtils";

export const getMeSessions: Endpoint<void, UserSessionBasic[]> = {
    method: "get",
    path: "/users/@me/sessions",
    auth: AuthScope.Session,
    description: "Returns all non-expired sessions of the current user.",
    returns: "Array of user sessions.",
    source: import.meta.path,
    requestBody: null,
    responseBody: makeArray(USER_SESSION_BASIC),
    pathParams: null,
    queryParams: null,
    async handleRequest({ timer, session }) {
        using _ = timer.create("getMeSessions");

        const sessions = await pg<Result[]>`
            SELECT id, started_at, last_action_at, ip, user_agent, user_agent_hint, origin
            FROM user_sessions
            WHERE user_id = ${session.userId}
            ORDER BY id
        `;

        return sessions.map(format);
    },
};

type Result = Pick<
    UserSessionModel,
    "id" | "started_at" | "last_action_at" | "ip" | "user_agent" | "user_agent_hint" | "origin"
>;

function format(x: Result): UserSessionBasic {
    return {
        id: castNumber(x.id),
        startedAt: x.started_at.toISOString(),
        lastActionAt: x.last_action_at.toISOString(),
        fingerprint: {
            ip: x.ip,
            userAgent: x.user_agent,
            userAgentHint: x.user_agent_hint,
            origin: x.origin,
        },
    };
}
