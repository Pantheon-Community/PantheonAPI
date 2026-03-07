import { ExpiredTokenError, InvalidTokenError } from "@/errors/UnauthorizedError";
import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/types/Common";
import type { InternalSession } from "@/types/Internal";
import { wrapPgError } from "../utils/handlePgError";
import type { UserSessionModel } from "./userSessionModel";

type SelectQuery = Pick<
    UserSessionModel,
    "access_token" | "refresh_token" | "expires_at" | "user_id"
>;

export async function getUserSession(token: UserToken): Promise<InternalSession> {
    try {
        const sessions = await pg<SelectQuery[]>`
            SELECT
                access_token,
                refresh_token,
                expires_at,
                user_id
            FROM user_sessions
            WHERE access_token = ${token}
        `;

        if (sessions.length === 0) {
            throw new InvalidTokenError();
        }

        const { expires_at, access_token, refresh_token, user_id } = sessions[0];

        if (expires_at.getTime() < Date.now()) {
            throw new ExpiredTokenError();
        }

        return { accessToken: access_token, refreshToken: refresh_token, userId: user_id };
    } catch (error) {
        throw wrapPgError(error);
    }
}
