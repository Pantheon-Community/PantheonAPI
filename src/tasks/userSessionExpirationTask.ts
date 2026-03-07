import { deleteExpiredUserSessions } from "@/databases/userSessions/deleteExpiredUserSessions";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log, logWithTimeTaken } from "@/utils/logging";

let isDeletingExpiredSessions = false;

export async function userSessionExpirationTask(): Promise<void> {
    if (isDeletingExpiredSessions) return;

    isDeletingExpiredSessions = true;

    try {
        const startedAt = Date.now();

        const count = await deleteExpiredUserSessions();

        logWithTimeTaken(
            `Deleted ${count} expired user session${count !== 1 ? "s" : ""}`,
            startedAt,
        );
    } catch (error) {
        log(colorize("Error deleting expired user sessions", Color.FgRed));
        console.error(error);
    } finally {
        isDeletingExpiredSessions = false;
    }
}
