import { rewardsDb } from "@/databases/rewards";
import type { EconomyReward } from "@/shared/types/EconomyReward";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Gets all economy rewards. */
export const getRewards: Endpoint<void, EconomyReward[]> = {
    method: "get",
    path: "/economy/rewards",
    auth: AuthScope.None,
    async handleRequest({ timer }) {
        return await rewardsDb.getAllRewards(timer);
    },
};
