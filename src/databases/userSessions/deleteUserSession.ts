import { pg } from "@/global/pg";
import type { UserSessionId, UserToken } from "@/shared/types/Common";
import { wrapPgError } from "../utils/handlePgError";

export async function deleteUserSessionByToken(token: UserToken): Promise<void> {
    try {
        await pg`DELETE FROM user_sessions WHERE access_token = ${token}`;
    } catch (error) {
        throw wrapPgError(error);
    }
}

export async function deleteUserSessionById(id: UserSessionId): Promise<void> {
    try {
        await pg`DELETE FROM user_sessions WHERE id = ${id}`;
    } catch (error) {
        throw wrapPgError(error);
    }
}
