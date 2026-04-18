import { config } from "@/global/config";
import { pgUnsafe } from "@/global/pg";
import type { SteamUserModel } from "@/models/SteamUserModel";
import type { DiscordId, Ip, Origin, UserAgent, UserAgentHint } from "@/shared/types/Common";

export interface UserModel {
    id: DiscordId;

    username: string;

    avatar: string | null;

    steam_id: SteamUserModel["id"] | null;

    first_seen_at: Date;

    last_seen_at: Date;

    lifetime_action_count: number;

    ip: Ip | null;

    user_agent: UserAgent | null;

    user_agent_hint: UserAgentHint | null;

    origin: Origin | null;
}

export async function createUsersTable(): Promise<void> {
    await pgUnsafe(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            avatar TEXT,
            steam_id TEXT REFERENCES steam_users(id) ON DELETE SET NULL,
            first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
            last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
            lifetime_action_count INTEGER NOT NULL DEFAULT 0,
            ip TEXT,
            user_agent TEXT,
            user_agent_hint TEXT,
            origin TEXT
        );

        CREATE INDEX IF NOT EXISTS users_steam_id_idx ON users (steam_id);

        INSERT INTO users (id, username)
        VALUES ('${config.db.rootUserId}', 'Root User')
        ON CONFLICT (id) DO NOTHING;

        ALTER TABLE users DROP COLUMN IF EXISTS balance;
        ALTER TABLE users DROP COLUMN IF EXISTS lifetime_balance;
        ALTER TABLE users DROP COLUMN IF EXISTS lifetime_purchase_count;
    `);
}
