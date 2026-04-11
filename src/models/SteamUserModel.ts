import { pg } from "@/global/pg";
import type { SteamId64 } from "@/shared/types/SteamUser";

export interface SteamUserModel {
    id: SteamId64;

    username: string;

    avatar: string | null;

    location: string | null;

    member_since: Date | null;

    first_seen_at: Date | null;

    last_seen_at: Date | null;

    times_seen: number;
}

export async function createSteamUsersTable(): Promise<void> {
    await pg`
        CREATE TABLE IF NOT EXISTS steam_users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            avatar TEXT,
            location TEXT,
            member_since TIMESTAMP,
            first_seen_at TIMESTAMP,
            last_seen_at TIMESTAMP,
            times_seen INTEGER NOT NULL DEFAULT 0
        );
    `;
}
