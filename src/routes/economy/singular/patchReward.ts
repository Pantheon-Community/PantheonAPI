import { rewardsDb } from "@/databases/rewards";
import type { EconomyRewardInput, RewardId } from "@/shared/types/EconomyReward";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const patchReward: Endpoint<EconomyRewardInput, void, { id: RewardId }> = {
    method: "patch",
    path: "/economy/rewards/:id",
    auth: AuthScope.Permission,
    permissions: { generalPermissions: GeneralPermissions.EditEconomyRewards },
    async handleRequest({ req, timer }) {
        return await rewardsDb.updateReward(req.params.id, req.body, timer);
    },
};
