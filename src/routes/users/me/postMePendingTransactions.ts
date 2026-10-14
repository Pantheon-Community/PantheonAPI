import { ForbiddenError } from "@/errors/ForbiddenError";
import { NotFoundError } from "@/errors/NotFoundError";
import { pgTransaction, type TransactionSql } from "@/global/pg";
import type { EconomyRewardModel } from "@/models/EconomyRewardModel";
import type { PendingTransactionModel } from "@/models/PendingTransactionModel";
import type { SteamUserModel } from "@/models/SteamUserModel";
import type { DiscordId } from "@/shared/types/Common";
import type { EconomyRewardId } from "@/shared/types/EconomyReward";
import {
    MAKE_TRANSACTION_REQUEST,
    type MakeTransactionRequest,
} from "@/shared/types/Requests/MakeTransactionRequest";
import type { SteamId64 } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { castNumber } from "@/utils/castNumber";
import { makeArray } from "@/utils/specUtils";
import { sql } from "bun";

export const postMePendingTransactions: Endpoint<MakeTransactionRequest[]> = {
    method: "post",
    path: "/users/@me/pending-transactions",
    auth: AuthScope.Session,
    description: "Creates new economy transactions for the current user.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent | EndpointFlags.May403 | EndpointFlags.May404,
    tag: "economy",
    requestBody: makeArray(MAKE_TRANSACTION_REQUEST, 1, 10),
    responseBody: null,
    pathParams: null,
    queryParams: null,
    async handleRequest({ req, timer, session }) {
        using _ = timer.create("postMePendingTransactions");

        const transactions = req.body;

        let requiredBalance = 0;

        for (const { expectedPrice } of transactions) {
            if (!Number.isSafeInteger(expectedPrice) || expectedPrice < 0) {
                throw new ForbiddenError({
                    title: "Invalid Price",
                    description:
                        "One of the requested prices was invalid, you might need to refresh your page.",
                });
            }

            requiredBalance += expectedPrice;
        }

        // The debit and the queue rows must commit together, otherwise a
        // concurrent purchase could spend the same credits twice or leave a
        // charged purchase with nothing queued.
        await pgTransaction(async (tx) => {
            const steamId = await getSteamId(tx, session.userId);

            const rewardCostMap = await getRewardCosts(tx, transactions);

            for (const { rewardId, expectedPrice } of transactions) {
                const matchingRewardPrice = rewardCostMap.get(rewardId);

                if (matchingRewardPrice === undefined) {
                    throw new NotFoundError({
                        title: "Expired Reward",
                        description:
                            "One or more of the specified rewards is no longer available, you might need to refresh your page.",
                    });
                }

                if (matchingRewardPrice !== expectedPrice) {
                    throw new ForbiddenError({
                        title: "Mismatched Reward",
                        description:
                            "The requested price of one of the specified rewards did not match its actual price, you might need to refresh your page.",
                    });
                }
            }

            await debitBalance(tx, requiredBalance, transactions.length, steamId);

            await createTransactions(tx, transactions, steamId);
        });
    },
};

async function getSteamId(tx: TransactionSql, userId: DiscordId): Promise<SteamId64> {
    const [user] = await tx<Pick<SteamUserModel, "id">[]>`
        SELECT steam_users.id
        FROM steam_users
        JOIN users
        ON steam_users.id = users.steam_id
        WHERE users.id = ${userId}
        FOR UPDATE OF steam_users
    `;

    if (user === undefined) {
        throw new NotFoundError({
            title: "User Not Found",
            description: "Could not find you in the database, your account may have been deleted.",
        });
    }

    return user.id;
}

async function getRewardCosts(
    tx: TransactionSql,
    transactionRequests: MakeTransactionRequest[],
): Promise<Map<EconomyRewardId, number>> {
    const uniqueRewardIds = transactionRequests
        .map((x) => x.rewardId)
        .values()
        .toArray();

    const rewards = await tx<Pick<EconomyRewardModel, "id" | "cost">[]>`
        SELECT id, cost
        FROM economy_rewards
        WHERE id = ANY(${sql.array(uniqueRewardIds, "INTEGER")})
        FOR SHARE
    `;

    return new Map(rewards.map((x) => [castNumber(x.id), x.cost]));
}

async function debitBalance(
    tx: TransactionSql,
    requiredBalance: number,
    numTransactions: number,
    steamId: SteamId64,
): Promise<void> {
    const updated = await tx<[]>`
        UPDATE steam_users
        SET
            balance = balance - ${requiredBalance},
            lifetime_purchase_count = lifetime_purchase_count + ${numTransactions}
        WHERE id = ${steamId}
        AND balance >= ${requiredBalance}
        RETURNING 1
    `;

    if (updated.length === 0) {
        throw new ForbiddenError({
            title: "Not Enough Balance",
            description: "You are too poor to afford these rewards",
        });
    }
}

async function createTransactions(
    tx: TransactionSql,
    transactions: MakeTransactionRequest[],
    steamId: SteamId64,
): Promise<void> {
    const values = transactions.map<Omit<PendingTransactionModel, "id" | "made_at">>((x) => ({
        reward_id: x.rewardId.toString(),
        cost: x.expectedPrice,
        purchaser_id: steamId,
    }));

    await tx`INSERT INTO pending_transactions ${sql(values)}`;
}
