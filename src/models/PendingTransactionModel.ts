import { pg } from "@/global/pg";
import { type EconomyRewardModel } from "./EconomyRewardModel";
import { type SteamUserModel } from "./SteamUserModel";

export interface PendingTransactionModel {
    id: string;

    reward_id: EconomyRewardModel["id"];

    cost: number;

    made_at: Date;

    purchaser_id: SteamUserModel["id"];
}

export async function createPendingTransactionsTable(): Promise<void> {
    await pg`
        CREATE TABLE IF NOT EXISTS pending_transactions (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            reward_id INTEGER NOT NULL REFERENCES economy_rewards(id) ON DELETE CASCADE,
            cost INTEGER NOT NULL,
            made_at TIMESTAMP NOT NULL DEFAULT NOW(),
            purchaser_id TEXT NOT NULL REFERENCES steam_users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS pending_transactions_reward_id_idx ON pending_transactions (reward_id);
        CREATE INDEX IF NOT EXISTS pending_transactions_purchaser_id_idx ON pending_transactions (purchaser_id);
    `.simple();
}
