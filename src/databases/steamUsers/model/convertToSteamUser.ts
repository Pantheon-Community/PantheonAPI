import type { SteamUser } from "@/shared/types/SteamUser";
import type { SteamUserModel } from "./steamUserModel";

export function convertToSteamUser(model: SteamUserModel): SteamUser {
	return {
		id: model.id,
		username: model.username,
		firstSeenAt: model.first_seen_at !== null ? model.first_seen_at.toISOString() : null,
		lastSeenAt: model.last_seen_at !== null ? model.last_seen_at.toISOString() : null,
		timesSeen: model.times_seen,
	};
}
