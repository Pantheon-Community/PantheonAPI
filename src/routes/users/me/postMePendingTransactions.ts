import { ForbiddenError } from "@/errors/ForbiddenError";
import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { EconomyRewardModel } from "@/models/EconomyRewardModel";
import type { PendingTransactionModel } from "@/models/PendingTransactionModel";
import type { UserModel } from "@/models/UserModel";
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
import type { WithNull } from "@/types/WithNull";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { makeArray } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

export const postMePendingTransactions: Endpoint<MakeTransactionRequest[]> = {
    method: "post",
    path: "/users/@me/pending-transactions",
    auth: AuthScope.Session,
    description: "Creates new economy transactions for the current user.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent | EndpointFlags.May403 | EndpointFlags.May404,
    requestBody: makeArray(MAKE_TRANSACTION_REQUEST, 1, 10),
    responseBody: null,
    pathParams: null,
    queryParams: null,
    async handleRequest({ req, timer, session }) {
        const [steamId, balance] = await getSteamAndBalance(session.userId, timer);

        if (steamId === null) {
            throw new ForbiddenError({
                title: "No Steam Connection",
                description:
                    "You must link a Steam account to your Discord in order to buy things.",
            });
        }

        const rewardCostMap = await getRewardCosts(req.body, timer);

        let requiredBalance = 0;

        for (const { rewardId, expectedPrice } of req.body) {
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

            requiredBalance += matchingRewardPrice;
        }

        if (balance < requiredBalance) {
            throw new ForbiddenError({
                title: "Not Enough Balance",
                description: "You are too poor to afford these rewards",
            });
        }

        await Promise.all([
            addTransactionRecords(req.body.length, requiredBalance, session.userId, timer),
            createTransactions(req.body, steamId, timer),
        ]);
    },
};

async function getSteamAndBalance(
    userId: DiscordId,
    timer: ServerTimer,
): Promise<[SteamId64 | null, number]> {
    using _ = timer.create("getSteamAndBalance");

    try {
        const [user] = await pg<Pick<WithNull<UserModel>, "steam_id" | "balance">[]>`
            SELECT steam_id, balance
            FROM users
            WHERE id = ${userId}
        `;

        if (user === undefined) {
            throw new NotFoundError({
                title: "User Not Found",
                description:
                    "Could not find you in the database, your account may have been deleted.",
            });
        }

        return [user.steam_id, user.balance];
    } catch (error) {
        throw wrapPgError(error);
    }
}

async function getRewardCosts(
    transactionRequests: MakeTransactionRequest[],
    timer: ServerTimer,
): Promise<Map<EconomyRewardId, number>> {
    using _ = timer.create("getRewardCosts");

    const uniqueRewardIds = new Set(transactionRequests.map((x) => x.rewardId)).values().toArray();

    try {
        const rewards = await pg<Pick<EconomyRewardModel, "id" | "cost">[]>`
                SELECT id, cost
                FROM economy_rewards
                WHERE id = ANY(${sql.array(uniqueRewardIds, "INTEGER")})
            `;

        return new Map(rewards.map((x) => [castNumber(x.id), x.cost]));
    } catch (error) {
        throw wrapPgError(error);
    }
}

async function addTransactionRecords(
    numTransactions: number,
    requiredBalance: number,
    userId: DiscordId,
    timer: ServerTimer,
): Promise<void> {
    using _ = timer.create("addTransactionRecords");

    try {
        await pg`
            UPDATE users
            SET
                balance = balance - ${requiredBalance},
                lifetime_purchase_count = lifetime_purchase_count + ${numTransactions}
            WHERE id = ${userId} AND balance >= ${requiredBalance}`;
    } catch (error) {
        throw wrapPgError(error);
    }
}

async function createTransactions(
    transactions: MakeTransactionRequest[],
    steamId: SteamId64,
    timer: ServerTimer,
): Promise<void> {
    using _ = timer.create("createTransactions");

    const values = transactions.map<Omit<PendingTransactionModel, "id" | "made_at">>((x) => ({
        reward_id: x.rewardId.toString(),
        cost: x.expectedPrice,
        purchaser_id: steamId,
    }));

    try {
        await pg`INSERT INTO pending_transactions ${sql(values)}`;
    } catch (error) {
        throw wrapPgError(error);
    }
}
