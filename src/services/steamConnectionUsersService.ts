import { convertToSteamUser } from "@/databases/steamUsers/model/convertToSteamUser";
import { upsertSteamUserFromDiscord } from "@/databases/steamUsers/upsertSteamUserFromDiscord";
import { fetchMySteamConnections } from "@/discord/main/fetchMeSteamConnections";
import type { UserToken } from "@/shared/types/Common";
import type { SteamUser } from "@/shared/types/SteamUser";

/** Fetches the Steam connections of the given Discord user and updates them in the database. */
export async function steamConnectionUsersService(token: UserToken): Promise<SteamUser[]> {
	const steamConnections = await fetchMySteamConnections(token);

	const steamUsers = await Promise.all(
		steamConnections.slice(0, 10).map(upsertSteamUserFromDiscord),
	);

	return steamUsers.map(convertToSteamUser);
}
