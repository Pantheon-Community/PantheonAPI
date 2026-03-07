import { pg } from "@/global/pg";
import { wrapPgError } from "../utils/handlePgError";

export async function deleteExpiredUserSessions(): Promise<number> {
    try {
        const deletedRows = await pg`DELETE FROM user_sessions WHERE expires_at <= NOW()`;

        return deletedRows.count;
    } catch (error) {
        throw wrapPgError(error);
    }
}
