import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { EconomyRewardItemModel } from "@/models/EconomyRewardItemModel";
import type { EconomyRewardModel } from "@/models/EconomyRewardModel";
import type { DiscordId } from "@/shared/types/Common";
import {
    ECONOMY_REWARD_ID,
    ECONOMY_REWARD_PAYLOAD,
    type EconomyRewardId,
    type EconomyRewardPayload,
} from "@/shared/types/EconomyReward";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import type { ServerTimer } from "@/utils/serverTimer";
import { makeParams } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

export const patchReward: Endpoint<EconomyRewardPayload, void, { id: EconomyRewardId }> = {
    method: "patch",
    path: "/economy/rewards/:id",
    auth: AuthScope.Permission,
    description: "Modifies an existing economy reward.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent | EndpointFlags.May404,
    requestBody: ECONOMY_REWARD_PAYLOAD,
    responseBody: null,
    pathParams: makeParams({ id: ECONOMY_REWARD_ID }),
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditEconomyRewards },
    async handleRequest({ req, session, timer }) {
        const wasUpdated = await updateReward(req.params.id, req.body, session.userId, timer);

        if (!wasUpdated) {
            throw new NotFoundError({
                title: "Reward Not Found",
                description:
                    "An economy reward with this ID does not exist in the database, it may have been deleted.",
            });
        }

        await updateRewardItems(req.params.id, req.body, timer);
    },
};

async function updateReward(
    rewardId: EconomyRewardId,
    payload: EconomyRewardPayload,
    userId: DiscordId,
    timer: ServerTimer,
): Promise<boolean> {
    using _ = timer.create("updateReward");

    const { title, subtitle, description, image, cost, normalCost } = payload;

    const update: Partial<EconomyRewardModel> = {
        title,
        subtitle,
        description,
        image,
        cost,
        normal_cost: normalCost,
        last_updated_by: userId,
    };

    try {
        const updatedRows = await pg<[]>`
            UPDATE economy_rewards
            SET ${sql(update)}, last_updated_at = NOW()
            WHERE id = ${rewardId}
            RETURNING 1
        `;

        return updatedRows.length > 0;
    } catch (error) {
        throw wrapPgError(error);
    }
}

async function updateRewardItems(
    rewardId: EconomyRewardId,
    payload: EconomyRewardPayload,
    timer: ServerTimer,
): Promise<void> {
    const { items } = payload;

    try {
        using _ = timer.create("deleteOldRewardItems");

        await pg`DELETE FROM economy_reward_items WHERE reward_id = ${rewardId}`;
    } catch (error) {
        throw wrapPgError(error);
    }

    if (items.length === 0) return;

    try {
        using _ = timer.create("createNewRewardItems");

        const rewardIdStr = rewardId.toString();

        const values = items.map<EconomyRewardItemModel>(({ id, count }) => ({
            reward_id: rewardIdStr,
            item_id: id,
            item_count: count,
        }));

        await pg`INSERT INTO economy_reward_items ${sql(values)}`;
    } catch (error) {
        throw wrapPgError(error);
    }
}
