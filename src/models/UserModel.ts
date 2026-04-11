import { config } from "@/global/config";
import { pg } from "@/global/pg";
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

    balance: number;

    lifetime_balance: number;

    lifetime_purchase_count: number;
}

export async function createUsersTable(): Promise<void> {
    await pg.unsafe(`
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
            origin TEXT,
            balance INTEGER NOT NULL DEFAULT 0,
            lifetime_balance INTEGER NOT NULL DEFAULT 0,
            lifetime_purchase_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS users_steam_id_idx ON users (steam_id);

        INSERT INTO users (id, username)
        VALUES ('${config.db.rootUserId}', 'Root User')
        ON CONFLICT (id) DO NOTHING;
    `);
}
