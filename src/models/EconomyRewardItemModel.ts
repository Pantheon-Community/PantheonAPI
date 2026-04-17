import { pg } from "@/global/pg";
import type { EconomyRewardModel } from "./EconomyRewardModel";

export interface EconomyRewardItemModel {
    reward_id: EconomyRewardModel["id"];

    item_id: number;

    item_count: number;
}

export async function createEconomyRewardItemsTable(): Promise<void> {
    await pg`
        CREATE TABLE IF NOT EXISTS economy_reward_items (
            reward_id INTEGER NOT NULL REFERENCES economy_rewards(id) ON DELETE CASCADE,
            item_id INTEGER NOT NULL,
            item_count INTEGER NOT NULL,
            PRIMARY KEY (reward_id, item_id)
        );
    `;
}
