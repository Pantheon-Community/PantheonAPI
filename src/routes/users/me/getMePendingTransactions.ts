import { pg } from "@/global/pg";
import type { PendingTransactionModel } from "@/models/PendingTransactionModel";
import { ECONOMY_TRANSACTION, type EconomyTransaction } from "@/shared/types/EconomyTransaction";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { castNumber } from "@/utils/castNumber";
import { makeArray } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";

export const getMePendingTransactions: Endpoint<void, EconomyTransaction[]> = {
    method: "get",
    path: "/users/@me/pending-transactions",
    auth: AuthScope.Session,
    description: "Gets all pending transactions of the current user.",
    returns: "Array of pending transactions.",
    tags: ["Economy", "Me", "Users"],
    requestBody: null,
    responseBody: makeArray(ECONOMY_TRANSACTION),
    pathParams: null,
    queryParams: null,
    async handleRequest({ timer, session }) {
        using _ = timer.create("getMePendingTransactions");

        try {
            const transactions = await pg<PendingTransactionModel[]>`
                SELECT pending_transactions.*
                FROM pending_transactions
                JOIN users
                ON pending_transactions.purchaser_id = users.steam_id
                WHERE users.id = ${session.userId}
            `;

            return transactions.map(format);
        } catch (error) {
            throw wrapPgError(error);
        }
    },
};

function format(x: PendingTransactionModel): EconomyTransaction {
    return {
        id: castNumber(x.id),
        rewardId: castNumber(x.reward_id),
        cost: x.cost,
        madeAt: x.made_at.toISOString(),
        purchaserId: x.purchaser_id,
    };
}
