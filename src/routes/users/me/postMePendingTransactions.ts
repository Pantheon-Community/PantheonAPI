import { pendingTransactionsDb } from "@/databases/pendingTransactions";
import { rewardsDb } from "@/databases/rewards";
import { usersDb } from "@/databases/users";
import { ForbiddenError } from "@/errors/ForbiddenError";
import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { RewardId } from "@/shared/types/EconomyReward";
import type { MakeTransactionRequest } from "@/shared/types/Requests/MakeTransactionRequest";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Creates new economy transactions for the current user. */
export const postMePendingTransactions: Endpoint<MakeTransactionRequest[]> = {
    method: "post",
    path: "/users/@me/pending-transactions",
    auth: AuthScope.Session,
    async handleRequest({ req, timer, session }) {
        const { steamId, balance } = await usersDb.getUserSteamAndBalance(session.userId, timer);

        if (steamId === null) {
            throw new ForbiddenError({
                title: "No Steam Connection",
                description:
                    "You must link a Steam account to your Discord in order to buy things.",
            });
        }

        const rewardCostMap = new Map<RewardId, number>();

        const allRewards = await rewardsDb.getSpecificRewards(
            req.body.map((x) => x.rewardId),
            timer,
        );

        for (const reward of allRewards) {
            rewardCostMap.set(reward.id, reward.cost);
        }

        let requiredBalance = 0;

        for (const { rewardId, expectedPrice } of req.body) {
            const matchingRewardPrice = rewardCostMap.get(rewardId);

            if (matchingRewardPrice === undefined) {
                throw new NotFoundError({
                    title: "Expired Reward",
                    description: `One of the specified rewards is no longer available.`,
                });
            }

            if (matchingRewardPrice !== expectedPrice) {
                throw new ForbiddenError({
                    title: "Mismatched Reward",
                    description: `The requested price of one of the specified rewards did not match its actual price.`,
                });
            }

            requiredBalance += matchingRewardPrice;
        }

        if (balance < requiredBalance) {
            throw new ForbiddenError({
                title: "Not Enough Balance",
                description: `You are too poor to afford these rewards`,
            });
        }

        return await pg.begin(async (tx) => {
            await Promise.all([
                usersDb.addTransactionRecords(
                    session.userId,
                    requiredBalance,
                    req.body.length,
                    tx,
                    timer,
                ),
                pendingTransactionsDb.createTransactions(
                    req.body.map((x) => ({ id: x.rewardId, cost: x.expectedPrice })),
                    steamId,
                    tx,
                    timer,
                ),
            ]);
        });
    },
};
