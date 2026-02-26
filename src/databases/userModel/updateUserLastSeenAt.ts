import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";

export function updateUserLastSeenAt(id: DiscordId, ip: string): void {
	// Not really an important operation to log errors for.
	pg`UPDATE users set last_seen_at = NOW(), latest_ip = ${ip} WHERE id = ${id}`.catch(() => null);
}
