import { steamConnectionService } from "@/services/steamConnectionService";
import { STEAM_USER, type SteamUser } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeArray } from "@/utils/specUtils";

export const getMeSteamUsers: Endpoint<void, SteamUser[]> = {
    method: "get",
    path: "/users/@me/steam-users",
    auth: AuthScope.Session,
    description: "Gets all the Discord Steam connections of the current user.",
    returns: "Array of Discord Steam connections.",
    tag: "Users",
    flags: EndpointFlags.MakesSecondaryRequests,
    requestBody: null,
    responseBody: makeArray(STEAM_USER),
    pathParams: null,
    queryParams: null,
    async handleRequest({ timer, session }) {
        return await steamConnectionService(session.accessToken, timer);
    },
};
