import { pg } from "@/global/pg";
import type { UserToken } from "@/shared/types/Common";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "../../utils/handlePgError";

export async function deleteMySession(token: UserToken, timer: ServerTimer): Promise<void> {
    using _ = timer.create("deleteMySession");

    try {
        await pg`DELETE FROM user_sessions WHERE access_token = ${token}`;
    } catch (error) {
        throw wrapPgError(error);
    }
}
