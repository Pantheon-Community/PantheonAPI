import { getSteamUsersFromDiscord } from "@/databases/steamUsers/getSteamUsersFromDiscord";
import type { DiscordId } from "@/shared/types/Common";
import { RequestMethod } from "@/shared/types/RequestMethod";
import type { SteamUserFromDiscord } from "@/shared/types/SteamUserFromDiscord";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

interface QueryParams {
    ids: DiscordId[];
}

export const getDiscordToSteam: Endpoint<void, SteamUserFromDiscord[], void, QueryParams> = {
    method: RequestMethod.Get,
    path: "/lookup/discord-to-steam",
    auth: AuthScope.None,
    async handleRequest({ req, timer }) {
        return await getSteamUsersFromDiscord(req.query.ids, timer);
    },
};
