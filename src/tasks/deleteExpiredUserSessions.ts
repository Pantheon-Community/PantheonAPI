import { pg } from "@/global/pg";
import { pluralize } from "@/shared/utils/pluralize";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log, logWithTimeTaken } from "@/utils/logging";

let isDeletingExpiredSessions = false;

export async function deleteExpiredUserSessions(): Promise<void> {
    if (isDeletingExpiredSessions) return;

    isDeletingExpiredSessions = true;

    try {
        const startedAt = Date.now();

        const { count } = await pg<{ count: number }>`
            DELETE FROM user_sessions
            WHERE expires_at <= NOW()
        `;

        const sessions = pluralize(count, "session");

        logWithTimeTaken(`Deleted ${count} expired user ${sessions}`, startedAt);
    } catch (error) {
        log(colorize("Error deleting expired user sessions", Color.FgRed));
        console.error(error);
    } finally {
        isDeletingExpiredSessions = false;
    }
}
