import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";

export interface PluginTokenModel {
    id: string;

    label: string;

    token: string;

    times_used: number;

    last_used_at: Date;

    created_by: DiscordId | null;

    created_at: Date;

    last_updated_by: DiscordId | null;

    last_updated_at: Date;
}

export async function createPluginTokensTable(): Promise<void> {
    await pg`
        CREATE TABLE IF NOT EXISTS plugin_tokens (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            label TEXT NOT NULL UNIQUE,
            token TEXT NOT NULL,
            times_used INTEGER NOT NULL DEFAULT 0,
            last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
            created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            last_updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
            last_updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS plugin_tokens_token_idx ON plugin_tokens (token);
    `.simple();
}
