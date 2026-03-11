import { getDiscordUsersFromSteam } from "@/databases/users/getDiscordUsersFromSteam";
import type { SteamId64 } from "@/shared/types/Common";
import type { UserFromSteam } from "@/shared/types/UserFromSteam";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

interface QueryParams {
    ids: SteamId64[];
}

export const getSteamToDiscord: Endpoint<void, UserFromSteam[], void, QueryParams> = {
    method: "get",
    path: "/lookup/steam-to-discord",
    auth: AuthScope.None,
    async handleRequest({ req, timer }) {
        return await getDiscordUsersFromSteam(req.query.ids, timer);
    },
};
