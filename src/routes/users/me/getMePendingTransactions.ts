import { pendingTransactionsDb } from "@/databases/pendingTransactions";
import type { EconomyTransaction } from "@/shared/types/EconomyTransaction";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Gets all pending transactions of the current user. */
export const getMePendingTransactions: Endpoint<void, EconomyTransaction[]> = {
    method: "get",
    path: "/users/@me/pending-transactions",
    auth: AuthScope.Session,
    async handleRequest({ timer, session }) {
        return await pendingTransactionsDb.getTransactions(session.userId, timer);
    },
};
