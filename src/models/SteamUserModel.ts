import { pgUnsafe } from "@/global/pg";
import type { SteamId64 } from "@/shared/types/SteamUser";

export interface SteamUserModel {
    id: SteamId64;

    username: string;

    avatar: string | null;

    location: string | null;

    member_since: Date | null;

    group_name: string | null;

    first_seen_at: Date | null;

    last_seen_at: Date | null;

    times_seen: number;

    balance: number;

    lifetime_balance: number;

    lifetime_purchase_count: number;

    last_login_bonus_given_at: Date | null;

    login_streak: number;
}

export async function createSteamUsersTable(): Promise<void> {
    await pgUnsafe(`
        CREATE TABLE IF NOT EXISTS steam_users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            avatar TEXT,
            location TEXT,
            member_since TIMESTAMP,
            group_name TEXT,
            first_seen_at TIMESTAMP,
            last_seen_at TIMESTAMP,
            times_seen INTEGER NOT NULL DEFAULT 0,
            balance INTEGER NOT NULL DEFAULT 0,
            lifetime_balance INTEGER NOT NULL DEFAULT 0,
            lifetime_purchase_count INTEGER NOT NULL DEFAULT 0,
            last_login_bonus_given_at TIMESTAMP,
            login_streak INTEGER NOT NULL DEFAULT 0
        );
    `);
}
