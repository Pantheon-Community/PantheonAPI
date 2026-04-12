import { pg } from "@/global/pg";
import type { SteamUserModel } from "@/models/SteamUserModel";
import type { UserModel } from "@/models/UserModel";
import { DISCORD_ID, type DiscordId } from "@/shared/types/Common";
import {
    STEAM_USER_FROM_DISCORD,
    type SteamUserFromDiscord,
} from "@/shared/types/SteamUserFromDiscord";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { makeArray, makeParams } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

export const getDiscordToSteam: Endpoint<void, SteamUserFromDiscord[], void, { ids: DiscordId[] }> =
    {
        method: "get",
        path: "/lookup/discord-to-steam",
        auth: AuthScope.None,
        description: "Returns Steam user info from Discord IDs.",
        returns:
            "Array of the relevant Steam users for each of the the given Steam IDs.\n\nNote that this does **not** map 1:1 with the input array, since a Discord ID may not be associated with any steam users.",
        tags: ["Lookups"],
        requestBody: null,
        responseBody: makeArray(STEAM_USER_FROM_DISCORD),
        pathParams: null,
        queryParams: makeParams({ ids: makeArray(DISCORD_ID, 1, 40) }),
        async handleRequest({ req, timer }) {
            using _ = timer.create("getDiscordToSteam");

            try {
                const steamUsers = await pg<JoinResult[]>`
                    SELECT
                        steam_users.id,
                        steam_users.username,
                        steam_users.avatar,
                        users.id AS user_id
                    FROM steam_users
                    JOIN users
                    ON steam_users.id = users.steam_id
                    WHERE users.id = ANY(${sql.array(req.query.ids, "TEXT")})
                `;

                return steamUsers.map(format);
            } catch (error) {
                throw wrapPgError(error);
            }
        },
    };

interface JoinResult extends Pick<SteamUserModel, "id" | "username" | "avatar"> {
    user_id: UserModel["id"];
}

function format(x: JoinResult): SteamUserFromDiscord {
    return {
        discordId: x.user_id,
        steamId: x.id,
        steamUsername: x.username,
        steamAvatar: x.avatar,
    };
}
