import { usersDb } from "@/databases/users";
import type { SteamId64 } from "@/shared/types/SteamUser";
import type { UserFromSteam } from "@/shared/types/UserFromSteam";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

interface QueryParams {
    ids: SteamId64[];
}

/** Returns Discord user info from Steam IDs. */
export const getSteamToDiscord: Endpoint<void, UserFromSteam[], void, QueryParams> = {
    method: "get",
    path: "/lookup/steam-to-discord",
    auth: AuthScope.None,
    async handleRequest({ req, timer }) {
        return await usersDb.getUsersFromSteam(req.query.ids, timer);
    },
};
