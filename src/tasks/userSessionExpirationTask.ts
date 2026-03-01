import { deleteExpiredUserSessions } from "@/databases/userSessions/deleteExpiredUserSessions";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log } from "@/utils/logging";

let isDeletingExpiredSessions = false;

export async function userSessionExpirationTask(): Promise<void> {
	if (isDeletingExpiredSessions) return;

	isDeletingExpiredSessions = true;

	try {
		const count = await deleteExpiredUserSessions();
		log(`Deleted ${count} expired user session${count !== 1 ? "s" : ""}`);
	} catch (error) {
		log(colorize("Error deleting expired user sessions", Color.FgRed));
		console.error(error);
	} finally {
		isDeletingExpiredSessions = false;
	}
}
