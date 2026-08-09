import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import {
    SET_USER_BALANCE_REQUEST,
    type SetUserBalanceRequest,
} from "@/shared/types/Requests/SetUserBalanceRequest";
import { STEAM_ID_64, type SteamId64 } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";

export const putUserBalance: Endpoint<SetUserBalanceRequest, void, { steamId: SteamId64 }> = {
    method: "put",
    path: "/users/:steamId/balance",
    auth: AuthScope.Plugin,
    description: "Sets the balance of a user.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent | EndpointFlags.May404,
    tag: "economy",
    requestBody: SET_USER_BALANCE_REQUEST,
    responseBody: null,
    pathParams: makeParams({ steamId: STEAM_ID_64 }),
    queryParams: null,
    async handleRequest({ req, timer }) {
        using _ = timer.create("setUserBalance");

        const { amount } = req.body;

        const updatedRows = await pg<[]>`
                UPDATE steam_users
                SET
                    balance = ${amount},
                    lifetime_balance = GREATEST(lifetime_balance, ${amount})
                WHERE id = ${req.params.steamId}
                RETURNING 1
            `;

        if (updatedRows.length < 1) {
            throw new NotFoundError({
                title: "Steam User Not Found",
                description: "The given Steam user does not exist.",
            });
        }
    },
};
