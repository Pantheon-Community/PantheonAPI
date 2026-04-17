import { pg } from "@/global/pg";
import type { EconomyRewardModel } from "./EconomyRewardModel";
import type { SteamUserModel } from "./SteamUserModel";

export interface CompletedTransactionModel {
    id: string;

    reward_id: EconomyRewardModel["id"] | null;

    cost: number;

    made_at: Date;

    completed_at: Date;

    purchaser_id: SteamUserModel["id"];
}

export async function createCompletedTransactionsTable(): Promise<void> {
    await pg`
        CREATE TABLE IF NOT EXISTS completed_transactions (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            reward_id INTEGER REFERENCES economy_rewards(id) ON DELETE SET NULL,
            cost INTEGER NOT NULL,
            made_at TIMESTAMP NOT NULL,
            completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
            purchaser_id TEXT NOT NULL REFERENCES steam_users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS completed_transactions_reward_id_idx ON completed_transactions (reward_id);
        CREATE INDEX IF NOT EXISTS completed_transactions_purchaser_id_idx ON completed_transactions (purchaser_id);
    `.simple();
}
