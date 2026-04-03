import { rewardsDb } from "@/databases/rewards";
import type { EconomyRewardInput, RewardId } from "@/shared/types/EconomyReward";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Creates a new economy reward. */
export const postRewards: Endpoint<EconomyRewardInput, RewardId> = {
    method: "post",
    path: "/economy/rewards",
    auth: AuthScope.Permission,
    permissions: { generalPermissions: GeneralPermissions.EditEconomyRewards },
    async handleRequest({ req, timer, session }) {
        return await rewardsDb.createReward(req.body, session.userId, timer);
    },
};
