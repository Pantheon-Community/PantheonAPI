import { wrapPgError } from "@/databases/utils/handlePgError";
import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { DiscordId, UserSessionId } from "@/shared/types/Common";
import type { ServerTimer } from "@/utils/serverTimer";

export async function deleteOneOfMySessions(
    userId: DiscordId,
    id: UserSessionId,
    timer: ServerTimer,
): Promise<void> {
    using _ = timer.create("deleteOneOfMySessions");

    try {
        const deletedRows = await pg`
            DELETE FROM user_sessions
            WHERE id = ${id} AND user_id = ${userId}
        `;

        if (deletedRows.count !== 1) {
            throw new NotFoundError({
                title: "Session Not Found",
                description: "The given session is not yours.",
            });
        }
    } catch (error) {
        throw wrapPgError(error);
    }
}
