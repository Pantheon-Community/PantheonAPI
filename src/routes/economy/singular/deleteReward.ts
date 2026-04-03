import { rewardsDb } from "@/databases/rewards";
import type { RewardId } from "@/shared/types/EconomyReward";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const deleteReward: Endpoint<void, void, { id: RewardId }> = {
    method: "delete",
    path: "/economy/rewards/:id",
    auth: AuthScope.Permission,
    permissions: { generalPermissions: GeneralPermissions.EditEconomyRewards },
    async handleRequest({ req, timer }) {
        await rewardsDb.deleteReward(req.params.id, timer);
    },
};
