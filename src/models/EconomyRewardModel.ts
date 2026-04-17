import { pg } from "@/global/pg";
import type { UserModel } from "./UserModel";

export interface EconomyRewardModel {
    id: string;

    title: string;

    subtitle: string;

    description: string;

    image: string;

    cost: number;

    normal_cost: number;

    posted_by: UserModel["id"] | null;

    posted_at: Date;

    last_updated_by: UserModel["id"] | null;

    last_updated_at: Date;
}

export async function createEconomyRewardsTable(): Promise<void> {
    await pg`
        CREATE TABLE IF NOT EXISTS economy_rewards (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            title TEXT NOT NULL,
            subtitle TEXT NOT NULL,
            description TEXT NOT NULL,
            image TEXT NOT NULL,
            cost INTEGER NOT NULL,
            normal_cost INTEGER NOT NULL,
            posted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
            posted_at TIMESTAMP NOT NULL DEFAULT NOW(),
            last_updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
            last_updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `;
}
