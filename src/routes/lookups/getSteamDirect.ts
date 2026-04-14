import { pg } from "@/global/pg";
import type { SteamUserModel } from "@/models/SteamUserModel";
import type { UserModel } from "@/models/UserModel";
import {
    GET_STEAM_DIRECT_RESPONSE,
    type GetDirectUser,
    type GetSteamDirectResponse,
} from "@/shared/types/Responses/GetSteamDirectResponse";
import { STEAM_ID_64, type SteamId64, type SteamUser } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import type { ServerTimer } from "@/utils/serverTimer";
import { makeArray, makeParams } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

export const getSteamDirect: Endpoint<void, GetSteamDirectResponse, void, { ids: SteamId64[] }> = {
    method: "get",
    path: "/lookup/steam-direct",
    auth: AuthScope.Plugin,
    description: "Returns Steam user info from Steam IDs directly.",
    returns:
        "Array of the relevant Steam user info for the given Steam IDs.\n\nThis **does not** map 1:1 with the input array.",
    source: import.meta.path,
    requestBody: null,
    responseBody: GET_STEAM_DIRECT_RESPONSE,
    pathParams: null,
    queryParams: makeParams({ ids: makeArray(STEAM_ID_64, 1, 20) }),
    async handleRequest({ req, timer }) {
        const { ids } = req.query;

        const [steamUsers, users] = await Promise.all([
            getSteamUsers(ids, timer),
            getUsers(ids, timer),
        ]);

        return { steamUsers, users };
    },
};

function formatSteamUser(x: SteamUserModel): SteamUser {
    const {
        id,
        username,
        avatar,
        location,
        member_since,
        first_seen_at,
        last_seen_at,
        times_seen,
    } = x;

    return {
        id,
        username,
        avatar,
        location,
        memberSince: member_since?.toISOString() ?? null,
        analytics:
            first_seen_at !== null && last_seen_at !== null
                ? {
                      firstSeenAt: first_seen_at.toISOString(),
                      lastSeenAt: last_seen_at.toISOString(),
                      timesSeen: times_seen,
                  }
                : null,
    };
}

async function getSteamUsers(ids: SteamId64[], timer: ServerTimer): Promise<SteamUser[]> {
    using _ = timer.create("getSteamUsers");

    try {
        const steamUsers = await pg<SteamUserModel[]>`
            SELECT *
            FROM steam_users
            WHERE id = ANY(${sql.array(ids, "TEXT")})
        `;

        return steamUsers.map(formatSteamUser);
    } catch (error) {
        throw wrapPgError(error);
    }
}

interface Result extends Pick<UserModel, "id" | "username" | "avatar"> {
    steam_id: NonNullable<UserModel["steam_id"]>;
}

function formatUser(x: Result): GetDirectUser {
    const { id, username, avatar, steam_id } = x;

    return { id, username, avatar, steamId: steam_id };
}

async function getUsers(ids: SteamId64[], timer: ServerTimer): Promise<GetDirectUser[]> {
    using _ = timer.create("getUsers");

    try {
        const users = await pg<Result[]>`
            SELECT id, username, avatar, steam_id
            FROM users
            WHERE steam_id = ANY(${sql.array(ids, "TEXT")})
        `;

        return users.map(formatUser);
    } catch (error) {
        throw wrapPgError(error);
    }
}
