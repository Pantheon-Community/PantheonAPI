import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { PendingTransactionModel } from "@/models/PendingTransactionModel";
import { ECONOMY_REWARD_ID, type EconomyRewardId } from "@/shared/types/EconomyReward";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";

export const deleteMePendingTransaction: Endpoint<void, void, { id: EconomyRewardId }> = {
    method: "delete",
    path: "/users/@me/pending-transactions/:id",
    auth: AuthScope.Session,
    description: "Refuns a pending transaction.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent | EndpointFlags.May404,
    tag: "economy",
    requestBody: null,
    responseBody: null,
    pathParams: makeParams({ id: ECONOMY_REWARD_ID }),
    queryParams: null,
    async handleRequest({ req, timer, session }) {
        let deletedTransactionCost: number;

        try {
            using _ = timer.create("deleteTransaction");

            const [deletedTransaction] = await pg<Pick<PendingTransactionModel, "cost">[]>`
                DELETE FROM pending_transactions
                WHERE id = ${req.params.id}
                RETURNING cost
            `;

            if (deletedTransaction === undefined) {
                throw new NotFoundError({
                    title: "Transaction Not Found",
                    description:
                        "A pending transaction with this ID does not exist in the database, it may have already been completed.",
                });
            }

            deletedTransactionCost = deletedTransaction.cost;
        } catch (error) {
            throw wrapPgError(error);
        }

        try {
            using _ = timer.create("increaseBalance");

            await pg`
                UPDATE users
                SET
                    balance = balance + ${deletedTransactionCost},
                    lifetime_purchase_count = lifetime_purchase_count - 1
                WHERE id = ${session.userId}
            `;
        } catch (error) {
            throw wrapPgError(error);
        }
    },
};
