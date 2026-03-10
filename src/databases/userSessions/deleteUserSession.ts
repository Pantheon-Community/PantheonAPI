import { pg } from "@/global/pg";
import type { UserSessionId, UserToken } from "@/shared/types/Common";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "../utils/handlePgError";

export async function deleteUserSessionByToken(
    token: UserToken,
    timer: ServerTimer,
): Promise<void> {
    using _ = timer.create("deleteUserSessionByToken");

    try {
        await pg`DELETE FROM user_sessions WHERE access_token = ${token}`;
    } catch (error) {
        throw wrapPgError(error);
    }
}

export async function deleteUserSessionById(id: UserSessionId, timer: ServerTimer): Promise<void> {
    using _ = timer.create("deleteUserSessionById");

    try {
        await pg`DELETE FROM user_sessions WHERE id = ${id}`;
    } catch (error) {
        throw wrapPgError(error);
    }
}
