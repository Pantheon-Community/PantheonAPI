import { pg } from "@/global/pg";
import type { EconomyRewardModel } from "@/models/EconomyRewardModel";
import type { DiscordId } from "@/shared/types/Common";
import {
    ECONOMY_REWARD_ID,
    ECONOMY_REWARD_PAYLOAD,
    type EconomyRewardId,
    type EconomyRewardItem,
    type EconomyRewardPayload,
} from "@/shared/types/EconomyReward";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "@/utils/wrapPgError";
import { sql } from "bun";

export const postRewards: Endpoint<EconomyRewardPayload, EconomyRewardId> = {
    method: "post",
    path: "/economy/rewards",
    auth: AuthScope.Permission,
    description: "Creates a new economy reward.",
    returns: "The ID of the created reward.",
    tags: ["Economy"],
    requestBody: ECONOMY_REWARD_PAYLOAD,
    responseBody: ECONOMY_REWARD_ID,
    pathParams: null,
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditEconomyRewards },
    async handleRequest({ req, timer, session }) {
        const rewardId = await createReward(req.body, session.userId, timer);

        if (req.body.items.length > 0) {
            await createRewardItems(rewardId, req.body.items, timer);
        }

        return rewardId;
    },
};

async function createReward(
    payload: EconomyRewardPayload,
    userId: DiscordId,
    timer: ServerTimer,
): Promise<EconomyRewardId> {
    using _ = timer.create("createReward");

    const { title, subtitle, description, image, cost, normalCost } = payload;

    const insert: Partial<EconomyRewardModel> = {
        title,
        subtitle,
        description,
        image,
        cost,
        normal_cost: normalCost,
        posted_by: userId,
        last_updated_by: userId,
    };

    try {
        const [reward] = await pg<[Pick<EconomyRewardModel, "id">]>`
            INSERT INTO economy_rewards ${sql(insert)}
            RETURNING id
        `;

        return castNumber(reward.id);
    } catch (error) {
        throw wrapPgError(error);
    }
}

async function createRewardItems(
    rewardId: EconomyRewardId,
    items: EconomyRewardItem[],
    timer: ServerTimer,
): Promise<void> {
    using _ = timer.create("createRewardItems");

    try {
        await Promise.all(
            items.map(({ id, count }) => {
                return pg`
                    INSERT INTO economy_reward_items (reward_id, item_id, item_count)
                    VALUES (${rewardId}, ${id}, ${count})
                `;
            }),
        );
    } catch (error) {
        throw wrapPgError(error);
    }
}
