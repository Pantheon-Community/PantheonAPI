import { pg } from "@/global/pg";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log, logWithTimeTaken } from "@/utils/logging";

export async function deleteExpiredUserSessions(): Promise<void> {
    try {
        const startedAt = Date.now();

        const { count } = await pg<{ count: number }>`
            DELETE FROM user_sessions
            WHERE expires_at <= NOW()
        `;

        logWithTimeTaken(
            `Deleted ${count.toLocaleString()} expired user session${count !== 1 ? "s" : ""}`,
            startedAt,
        );
    } catch (error) {
        log(colorize("Error deleting expired user sessions", Color.FgRed));
        console.error(error);
    }
}
