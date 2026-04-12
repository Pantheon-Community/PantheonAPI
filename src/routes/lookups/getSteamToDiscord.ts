import { pg } from "@/global/pg";
import { type UserModel } from "@/models/UserModel";
import { STEAM_ID_64, type SteamId64 } from "@/shared/types/SteamUser";
import { USER_FROM_STEAM, type UserFromSteam } from "@/shared/types/UserFromSteam";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { makeArray, makeParams } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

export const getSteamToDiscord: Endpoint<void, UserFromSteam[], void, { ids: SteamId64[] }> = {
    method: "get",
    path: "/lookup/steam-to-discord",
    auth: AuthScope.None,
    description: "Returns Discord user info from Steam IDs.",
    returns:
        "Array of the relevant Discord user(s) for the given Steam IDs.\n\nNote that this does **not** map 1:1 with the input array, since a Steam ID can be associated with any number of users.",
    tags: ["Lookups"],
    requestBody: null,
    responseBody: makeArray(USER_FROM_STEAM),
    pathParams: null,
    queryParams: makeParams({ ids: makeArray(STEAM_ID_64, 1, 40) }),
    async handleRequest({ req, timer }) {
        using _ = timer.create("getSteamToDiscord");

        try {
            const users = await pg<Result[]>`
                SELECT id, username, avatar, steam_id
                FROM users
                WHERE steam_id = ANY(${sql.array(req.query.ids, "TEXT")})
            `;

            return users.map(format);
        } catch (error) {
            throw wrapPgError(error);
        }
    },
};

interface Result extends Pick<UserModel, "id" | "username" | "avatar"> {
    steam_id: NonNullable<UserModel["steam_id"]>;
}

function format(x: Result): UserFromSteam {
    return {
        steamId: x.steam_id,
        discordId: x.id,
        discordUsername: x.username,
        discordAvatar: x.avatar,
    };
}
