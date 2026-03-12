import { ExpiredTokenError, InvalidTokenError } from "@/errors/UnauthorizedError";
import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/types/Common";
import type { InternalSession } from "@/types/Internal";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "../../utils/handlePgError";
import type { UserSessionModel } from "../userSessionModel";

type SelectQuery = Pick<
    UserSessionModel,
    "id" | "access_token" | "refresh_token" | "expires_at" | "user_id"
>;

export async function getMySession(token: UserToken, timer: ServerTimer): Promise<InternalSession> {
    using _ = timer.create("getMySession");

    try {
        const [session] = await pg<SelectQuery[]>`
            SELECT
                id,
                access_token,
                refresh_token,
                expires_at,
                user_id
            FROM user_sessions
            WHERE access_token = ${token}
        `;

        if (session === undefined) {
            throw new InvalidTokenError();
        }

        const { id, expires_at, access_token, refresh_token, user_id } = session;

        if (expires_at.getTime() < Date.now()) {
            throw new ExpiredTokenError();
        }

        return { id, accessToken: access_token, refreshToken: refresh_token, userId: user_id };
    } catch (error) {
        throw wrapPgError(error);
    }
}
