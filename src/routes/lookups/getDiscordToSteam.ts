import { joinSteamUsersFromDiscord } from "@/databases/joins/joinSteamUsersFromDiscord";
import type { DiscordId } from "@/shared/types/Common";
import type { SteamUserFromDiscord } from "@/shared/types/SteamUserFromDiscord";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

interface QueryParams {
    ids: DiscordId[];
}

/** Returns Steam user info from Discord IDs. */
export const getDiscordToSteam: Endpoint<void, SteamUserFromDiscord[], void, QueryParams> = {
    method: "get",
    path: "/lookup/discord-to-steam",
    auth: AuthScope.None,
    async handleRequest({ req, timer }) {
        return await joinSteamUsersFromDiscord(req.query.ids, timer);
    },
};
