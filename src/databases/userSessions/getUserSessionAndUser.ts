import { ExpiredTokenError, InvalidTokenError } from "@/errors/UnauthorizedError";
import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/types/Common";
import type { InternalSession, InternalUser } from "@/types/Internal";
import type { UserModel } from "../users/userModel";
import { wrapPgError } from "../utils/handlePgError";
import type { UserSessionModel } from "./userSessionModel";

interface InternalSessionAndUser {
    session: InternalSession;

    user: InternalUser;
}

interface SelectQuery extends Pick<
    UserSessionModel,
    "access_token" | "refresh_token" | "expires_at" | "user_id"
> {
    username: UserModel["username"];

    avatar: UserModel["avatar"];
}

export async function getUserSessionAndUser(token: UserToken): Promise<InternalSessionAndUser> {
    try {
        const sessions = await pg<SelectQuery[]>`
            SELECT
                user_sessions.access_token,
                user_sessions.refresh_token,
                user_sessions.expires_at,
                user_sessions.user_id,
                users.username,
                users.avatar
            FROM user_sessions
            JOIN users ON users.id = user_sessions.user_id
            WHERE access_token = ${token}
        `;

        if (sessions.length === 0) {
            throw new InvalidTokenError();
        }

        const { expires_at, access_token, refresh_token, user_id, username, avatar } = sessions[0];

        if (expires_at.getTime() < Date.now()) {
            throw new ExpiredTokenError();
        }

        return {
            session: {
                accessToken: access_token,
                refreshToken: refresh_token,
                userId: user_id,
            },
            user: {
                id: user_id,
                username: username,
                avatar: avatar,
            },
        };
    } catch (error) {
        throw wrapPgError(error);
    }
}
