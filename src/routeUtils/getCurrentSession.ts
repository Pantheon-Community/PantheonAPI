import { UnauthorizedError } from "@/errors/UnauthorizedError";
import { pg } from "@/global/pg";
import type { UserSessionModel } from "@/models/UserSessionModel";
import type { UserToken } from "@/shared/types/Common";
import type { Fingerprint } from "@/shared/types/Fingerprint";
import { Color } from "@/types/Color";
import type { InternalSession } from "@/types/Internal";
import { castNumber } from "@/utils/castNumber";
import { colorize } from "@/utils/colorize";
import { log } from "@/utils/logging";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

type Result = Pick<UserSessionModel, "id" | "user_id" | "refresh_token" | "expires_at">;

export async function getCurrentSession(
    token: UserToken,
    fingerprint: Fingerprint,
    timer: ServerTimer,
): Promise<InternalSession> {
    using _ = timer.create("getCurrentSession");

    const { ip, userAgent, userAgentHint, origin } = fingerprint;

    const ipQuery = ip ? sql`, ip = ${ip}` : sql``;
    const userAgentQuery = userAgent ? sql`, user_agent = ${userAgent}` : sql``;
    const userAgentHintQuery = userAgentHint ? sql`, user_agent_hint = ${userAgentHint}` : sql``;
    const originQuery = origin ? sql`, origin = ${origin}` : sql``;

    try {
        const [session] = await pg<Result[]>`
            UPDATE user_sessions
            SET
                action_count = action_count + 1,
                last_action_at = NOW()
                ${ipQuery} ${userAgentQuery} ${userAgentHintQuery} ${originQuery}
            WHERE access_token = ${token}
            RETURNING id, user_id, refresh_token, expires_at
        `;

        if (session === undefined) {
            throw new UnauthorizedError({
                title: "Invalid Token",
                description:
                    "The provided authorisation token was invalid, you might need to log in again.",
            });
        }

        const { id, expires_at, refresh_token, user_id } = session;

        if (expires_at.getTime() < Date.now()) {
            throw new UnauthorizedError({
                title: "Expired Token",
                description: "The provided authorization token has expired, please log back in.",
            });
        }

        // background user update (not awaited)
        pg`
            UPDATE users
            SET
               last_seen_at = NOW(),
               lifetime_action_count = lifetime_action_count + 1
               ${ipQuery} ${userAgentQuery} ${userAgentHintQuery} ${originQuery}
            WHERE id = ${user_id}
        `.catch((error) => {
            log(`Background update of user ${colorize(user_id, Color.FgRed)} threw an error`);

            console.error(error);
        });

        return {
            id: castNumber(id),
            userId: user_id,
            accessToken: token,
            refreshToken: refresh_token,
        };
    } catch (error) {
        throw wrapPgError(error);
    }
}
