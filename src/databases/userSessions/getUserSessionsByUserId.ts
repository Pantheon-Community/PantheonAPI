import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";
import type { UserSessionBasic } from "@/shared/types/UserSession";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "../utils/handlePgError";
import type { UserSessionModel } from "./userSessionModel";

type SelectQuery = Pick<
    UserSessionModel,
    "id" | "started_at" | "ip" | "user_agent" | "origin" | "last_action_at"
>;

export async function getUserSessionsByUserId(
    id: DiscordId,
    timer: ServerTimer,
): Promise<UserSessionBasic[]> {
    using _ = timer.create("getUserSessionsByUserId");

    try {
        const sessions = await pg<SelectQuery[]>`
            SELECT id, started_at, ip, user_agent, origin, last_action_at
            FROM user_sessions
            WHERE user_id = ${id} AND expires_at > NOW()
        `;

        return sessions.map((x) => ({
            id: x.id,
            startedAt: x.started_at.toISOString(),
            ip: x.ip,
            userAgent: x.user_agent,
            origin: x.origin,
            lastActionAt: x.last_action_at.toISOString(),
        }));
    } catch (error) {
        throw wrapPgError(error);
    }
}
