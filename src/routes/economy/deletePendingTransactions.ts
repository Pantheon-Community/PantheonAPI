import { pg } from "@/global/pg";
import type { CompletedTransactionModel } from "@/models/CompletedTransactionModel";
import type { PendingTransactionModel } from "@/models/PendingTransactionModel";
import {
    ECONOMY_TRANSACTION_ID,
    type EconomyTransactionId,
} from "@/shared/types/EconomyTransaction";
import type { SteamId64 } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { makeArray } from "@/utils/specUtils";
import { sql } from "bun";

export const deletePendingTransactions: Endpoint<EconomyTransactionId[]> = {
    method: "delete",
    path: "/economy/pending-transactions",
    auth: AuthScope.Plugin,
    description: "Completes the given transactions.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent,
    requestBody: makeArray(ECONOMY_TRANSACTION_ID, 1, 100),
    responseBody: null,
    pathParams: null,
    queryParams: null,
    async handleRequest({ req, timer }) {
        const ids = req.body;

        let deletedTransactions: DeletedTransaction[];

        {
            using _ = timer.create("deletePendingTransactions");

            deletedTransactions = await pg`
                DELETE FROM pending_transactions
                WHERE id = ANY(${sql.array(ids, "INTEGER")})
                RETURNING id, reward_id, cost, made_at, purchaser_id
            `;
        }

        const failedToDeleteIds = new Set(ids);

        for (const transaction of deletedTransactions) {
            failedToDeleteIds.delete(castNumber(transaction.id));
        }

        await Promise.all([
            createCompletedTransactions(deletedTransactions, timer),
            penaliseFailedDeletions(failedToDeleteIds, timer),
        ]);
    },
};

type DeletedTransaction = Pick<
    PendingTransactionModel,
    "id" | "reward_id" | "cost" | "made_at" | "purchaser_id"
>;

async function createCompletedTransactions(
    deleted: DeletedTransaction[],
    timer: ServerTimer,
): Promise<void> {
    if (deleted.length === 0) return;

    using _ = timer.create("createCompletedTransactions");

    const values = deleted.map<Partial<CompletedTransactionModel>>((x) => {
        const { reward_id, cost, made_at, purchaser_id } = x;

        return { reward_id, cost, made_at, purchaser_id };
    });

    await pg`INSERT INTO completed_transactions ${sql(values)}`;
}

type AlreadyCompletedTransaction = Pick<CompletedTransactionModel, "cost" | "purchaser_id">;

async function penaliseFailedDeletions(
    failures: Set<EconomyTransactionId>,
    timer: ServerTimer,
): Promise<void> {
    if (failures.size === 0) return;

    let alreadyCompleted: AlreadyCompletedTransaction[];

    {
        using _ = timer.create("fetchAlreadyCompletedTransactions");

        alreadyCompleted = await pg`
            SELECT cost, purchaser_id
            FROM completed_transactions
            WHERE id = ANY(${sql.array(failures.values().toArray(), "INTEGER")})
        `;
    }

    const amountsById = new Map<SteamId64, number>();

    for (const { cost, purchaser_id } of alreadyCompleted) {
        const existingAmount = amountsById.get(purchaser_id) ?? 0;

        amountsById.set(purchaser_id, existingAmount + cost);
    }

    await Promise.all(
        amountsById.entries().map(([steamId, amount]) => {
            return pg`
            UPDATE users
            SET balance = balance - ${amount * 2}
            WHERE steam_id = ${steamId}
        `;
        }),
    );
}
