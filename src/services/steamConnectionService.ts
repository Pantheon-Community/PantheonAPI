import { steamUsersDb } from "@/databases/steamUsers";
import { fetchMySteamConnections } from "@/other/discord/main/fetchMeSteamConnections";
import { getSteamUserInfo } from "@/other/steam/getSteamUserInfo";
import type { UserToken } from "@/shared/types/Common";
import type { SteamUserBasicWithTimes } from "@/shared/types/SteamUser";
import type { DiscordSteamConnection } from "@/types/Discord";
import type { SteamUserInfo } from "@/types/SteamUserInfo";
import type { ServerTimer } from "@/utils/serverTimer";

async function createSteamUser(
    connection: DiscordSteamConnection,
): Promise<SteamUserBasicWithTimes> {
    let info: SteamUserInfo;

    try {
        info = await getSteamUserInfo(connection.id);
    } catch {
        info = { avatar: null, location: null, memberSince: null };
    }

    return await steamUsersDb.addFromDiscordConnection(connection, info);
}

/** Fetches the Steam connections of the given Discord user and updates them in the database. */
export async function steamConnectionService(
    token: UserToken,
    timer: ServerTimer,
): Promise<SteamUserBasicWithTimes[]> {
    const steamConnections = await fetchMySteamConnections(token, timer);

    using _ = timer.create("createSteamUsers");

    return await Promise.all(steamConnections.slice(0, 5).map(createSteamUser));
}
