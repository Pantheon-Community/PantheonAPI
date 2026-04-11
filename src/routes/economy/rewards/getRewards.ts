import { pg } from "@/global/pg";
import type { EconomyRewardItemModel } from "@/models/EconomyRewardItemModel";
import type { EconomyRewardModel } from "@/models/EconomyRewardModel";
import { ECONOMY_REWARD, type EconomyReward } from "@/shared/types/EconomyReward";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { makeArray } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";

export const getRewards: Endpoint<void, EconomyReward[]> = {
    method: "get",
    path: "/economy/rewards",
    auth: AuthScope.None,
    description: "Gets all economy rewards.",
    returns: "Array of rewards.",
    tags: ["Economy"],
    requestBody: null,
    responseBody: makeArray(ECONOMY_REWARD),
    pathParams: null,
    queryParams: null,
    async handleRequest({ timer }) {
        const [rewards, rewardItems] = await Promise.all([
            getAllRewards(timer),
            getAllRewardItems(timer),
        ]);

        const rewardsMap = new Map(rewards.map((x) => [x.id, format(x)]));

        for (const { reward_id, item_id, item_count } of rewardItems) {
            rewardsMap.get(reward_id)?.items.push({ id: item_id, count: item_count });
        }

        return rewardsMap.values().toArray();
    },
};

function format(x: EconomyRewardModel): EconomyReward {
    return {
        id: castNumber(x.id),
        title: x.title,
        subtitle: x.subtitle,
        description: x.description,
        image: x.image,
        cost: x.cost,
        normalCost: x.normal_cost,
        postedBy: x.posted_by,
        postedAt: x.posted_at.toISOString(),
        lastUpdatedBy: x.last_updated_by,
        lastUpdatedAt: x.last_updated_at.toISOString(),
        items: [],
    };
}

async function getAllRewards(timer: ServerTimer): Promise<EconomyRewardModel[]> {
    using _ = timer.create("getAllRewards");

    try {
        return await pg`SELECT * FROM economy_rewards`;
    } catch (error) {
        throw wrapPgError(error);
    }
}

async function getAllRewardItems(timer: ServerTimer): Promise<EconomyRewardItemModel[]> {
    using _ = timer.create("getAllRewardItems");

    try {
        return await pg`SELECT * FROM economy_reward_items`;
    } catch (error) {
        throw wrapPgError(error);
    }
}
