import { steamUsersDb } from "@/databases/steamUsers";
import type { SteamId64, SteamUserWithTimes } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const getSteamDirect: Endpoint<void, SteamUserWithTimes[], void, { ids: SteamId64[] }> = {
    method: "get",
    path: "/lookup/steam-direct",
    auth: AuthScope.None,
    async handleRequest({ req, timer }) {
        return await steamUsersDb.getSteamUsersDirect(req.query.ids, timer);
    },
};
