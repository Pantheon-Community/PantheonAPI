import { joinUsersDiscord } from "@/databases/joins/joinUsersDiscords";
import type { SteamId64, SteamUserWithTimesAndDiscord } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const getSteamDirect: Endpoint<
    void,
    SteamUserWithTimesAndDiscord[],
    void,
    { ids: SteamId64[] }
> = {
    method: "get",
    path: "/lookup/steam-direct",
    auth: AuthScope.None,
    async handleRequest({ req, timer }) {
        return await joinUsersDiscord(req.query.ids, timer);
    },
};
