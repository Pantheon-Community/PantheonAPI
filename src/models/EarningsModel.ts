import { pg } from "@/global/pg";
import type { PluginTokenId } from "@/shared/types/PluginToken";
import type { SteamUserModel } from "./SteamUserModel";
import type { UserModel } from "./UserModel";

export interface EarningsModel {
    id: string;

    user_id: UserModel["id"];

    steam_id: SteamUserModel["id"];

    amount: number;

    made_by: PluginTokenId | null;

    made_at: Date;
}

export async function createEarningsTable(): Promise<void> {
    await pg`
        CREATE TABLE IF NOT EXISTS earnings (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            steam_id TEXT NOT NULL REFERENCES steam_users(id) ON DELETE CASCADE,
            amount INTEGER NOT NULL,
            made_by INTEGER REFERENCES plugin_tokens(id) ON DELETE SET NULL,
            made_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `;
}
