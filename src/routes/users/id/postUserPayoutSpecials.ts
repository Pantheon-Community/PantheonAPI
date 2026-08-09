import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { PendingTransactionModel } from "@/models/PendingTransactionModel";
import { ECONOMY_REWARD_ID, type EconomyRewardId } from "@/shared/types/EconomyReward";
import { STEAM_ID_64, type SteamId64 } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";
import { SQL, sql } from "bun";

export const postUserPayoutSpecial: Endpoint<
    void,
    void,
    { steamId: SteamId64; rewardId: EconomyRewardId }
> = {
    method: "post",
    path: "/users/:steamId/special-rewards/:rewardId",
    auth: AuthScope.Plugin,
    description:
        "Adds the given reward as a pending payout to the user, but without charging them its cost, giving them the reward for free.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent | EndpointFlags.May404,
    tag: "economy",
    requestBody: null,
    responseBody: null,
    pathParams: makeParams({ steamId: STEAM_ID_64, rewardId: ECONOMY_REWARD_ID }),
    queryParams: null,
    async handleRequest({ req, timer }) {
        using _ = timer.create("addPendingTransaction");

        const value: Omit<PendingTransactionModel, "id" | "made_at"> = {
            reward_id: req.params.rewardId.toString(),
            cost: 0,
            purchaser_id: req.params.steamId,
        };

        try {
            await pg`INSERT INTO pending_transactions ${sql(value)}`;
        } catch (error) {
            if (error instanceof Error && error.cause instanceof SQL.PostgresError) {
                if (error.cause.constraint === "pending_transactions_reward_id_fkey") {
                    throw new NotFoundError({
                        title: "Reward Not Found",
                        description:
                            "An economy reward with this ID does not exist in the database, it may have been deleted.",
                    });
                }
            }

            throw error;
        }
    },
};
