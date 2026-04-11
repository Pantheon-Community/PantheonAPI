import { pg } from "@/global/pg";
import type { PendingTransactionModel } from "@/models/PendingTransactionModel";
import {
    GET_PENDING_TRANSACTIONS_RESPONSE,
    type GetPendingTransactionsResponse,
} from "@/shared/types/Responses/GetPendingTransactionsResponse";
import { STEAM_ID_64, type SteamId64 } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { castNumber } from "@/utils/castNumber";
import { makeArray, makeParams } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

export const getPendingTransactions: Endpoint<
    void,
    GetPendingTransactionsResponse[],
    void,
    { ids: SteamId64[] }
> = {
    method: "get",
    path: "/economy/pending-transactions",
    auth: AuthScope.None,
    description: "Gets all pending transactions for the given Steam IDs.",
    returns: "Array of pending transactions.",
    tags: ["Economy", "Plugins"],
    requestBody: null,
    responseBody: makeArray(GET_PENDING_TRANSACTIONS_RESPONSE, 0, 100),
    pathParams: null,
    queryParams: makeParams({ ids: makeArray(STEAM_ID_64, 1, 60) }),
    async handleRequest({ req, timer }) {
        using _ = timer.create("getPendingTransactions");

        try {
            const transactions = await pg<Result[]>`
            SELECT id, reward_id, purchaser_id
            FROM pending_transactions
            WHERE purchaser_id = ANY(${sql.array(req.query.ids, "TEXT")})
            LIMIT 100
        `;

            return transactions.map(format);
        } catch (error) {
            throw wrapPgError(error);
        }
    },
};

type Result = Pick<PendingTransactionModel, "id" | "reward_id" | "purchaser_id">;

function format(x: Result): GetPendingTransactionsResponse {
    const { id, reward_id, purchaser_id } = x;

    return { id: castNumber(id), rewardId: castNumber(reward_id), purchaserId: purchaser_id };
}
