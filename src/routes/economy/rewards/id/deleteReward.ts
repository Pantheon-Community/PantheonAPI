import { pg } from "@/global/pg";
import { ECONOMY_REWARD_ID, type EconomyRewardId } from "@/shared/types/EconomyReward";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";

export const deleteReward: Endpoint<void, void, { id: EconomyRewardId }> = {
    method: "delete",
    path: "/economy/rewards/:id",
    auth: AuthScope.Permission,
    description: "Deletes an existing economy reward.",
    returns: "Success, no content.",
    tag: "Economy",
    flags: EndpointFlags.NoContent,
    requestBody: null,
    responseBody: null,
    pathParams: makeParams({ id: ECONOMY_REWARD_ID }),
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditEconomyRewards },
    async handleRequest({ req, timer }) {
        using _ = timer.create("deleteReward");

        try {
            // we don't care about return value, since 0 matching rows = already deleted
            await pg`DELETE FROM economy_rewards WHERE id = ${req.params.id}`;
        } catch (error) {
            throw wrapPgError(error);
        }
    },
};
