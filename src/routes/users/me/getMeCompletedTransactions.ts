import { pg } from "@/global/pg";
import type { CompletedTransactionModel } from "@/models/CompletedTransactionModel";
import {
    COMPLETED_ECONOMY_TRANSACTION,
    type CompletedEconomyTransaction,
} from "@/shared/types/EconomyTransaction";
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

export const getMeCompletedTransactions: Endpoint<
    void,
    WithPagination<CompletedEconomyTransaction>,
    void,
    PaginationParams
> = {
    method: "get",
    path: "/users/@me/completed-transactions",
    auth: AuthScope.Session,
    description: "Gets all completed transactions of the current user.",
    returns: "Array of completed transactions.",
    source: import.meta.path,
    tag: "economy",
    requestBody: null,
    responseBody: makePaginated(COMPLETED_ECONOMY_TRANSACTION),
    pathParams: null,
    queryParams: PAGINATION_PARAMS,
    async handleRequest({ req, timer, session }) {
        using _ = timer.create("getMeCompletedTransactions");

        const { page, perPage } = req.query;

        try {
            const transactions = await pg<Result[]>`
                SELECT completed_transactions.*, COUNT(*) OVER() AS total_count
                FROM completed_transactions
                JOIN users
                ON completed_transactions.purchaser_id = users.steam_id
                WHERE users.id = ${session.userId}
                ORDER BY completed_transactions.id
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

interface Result extends CompletedTransactionModel {
    total_count: string;
}

function format(x: CompletedTransactionModel): CompletedEconomyTransaction {
    return {
        id: castNumber(x.id),
        rewardId: x.reward_id === null ? null : castNumber(x.reward_id),
        cost: x.cost,
        madeAt: x.made_at.toISOString(),
        completedAt: x.completed_at.toISOString(),
        purchaserId: x.purchaser_id,
    };
}
