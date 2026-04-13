import { pg } from "@/global/pg";
import type { PendingTransactionModel } from "@/models/PendingTransactionModel";
import { ECONOMY_TRANSACTION, type EconomyTransaction } from "@/shared/types/EconomyTransaction";
import {
    PAGINATION_PARAMS,
    type PaginationParams,
    type WithPagination,
} from "@/shared/types/Pagination";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { castNumber } from "@/utils/castNumber";
import { makePaginated } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";

export const getMePendingTransactions: Endpoint<
    void,
    WithPagination<EconomyTransaction>,
    void,
    PaginationParams
> = {
    method: "get",
    path: "/users/@me/pending-transactions",
    auth: AuthScope.Session,
    description: "Gets all pending transactions of the current user.",
    returns: "Array of pending transactions.",
    tag: "Economy",
    requestBody: null,
    responseBody: makePaginated(ECONOMY_TRANSACTION),
    pathParams: null,
    queryParams: PAGINATION_PARAMS,
    async handleRequest({ req, timer, session }) {
        using _ = timer.create("getMePendingTransactions");

        const { page, perPage } = req.query;

        try {
            const transactions = await pg<Result[]>`
                SELECT pending_transactions.*, COUNT(*) OVER() AS total_count
                FROM pending_transactions
                JOIN users
                ON pending_transactions.purchaser_id = users.steam_id
                WHERE users.id = ${session.userId}
                ORDER BY pending_transactions.id
                LIMIT ${perPage}
                OFFSET ${page * perPage}
            `;

            return {
                items: transactions.map(format),
                totalItemCount: transactions[0] ? Number(transactions[0].total_count) : 0,
            };
        } catch (error) {
            throw wrapPgError(error);
        }
    },
};

interface Result extends PendingTransactionModel {
    total_count: string;
}

function format(x: PendingTransactionModel): EconomyTransaction {
    return {
        id: castNumber(x.id),
        rewardId: castNumber(x.reward_id),
        cost: x.cost,
        madeAt: x.made_at.toISOString(),
        purchaserId: x.purchaser_id,
    };
}
