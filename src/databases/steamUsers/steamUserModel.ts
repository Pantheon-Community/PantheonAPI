import { pg } from "@/global/pg";
import type { SteamId64 } from "@/shared/types/Common";
import { Column } from "../utils/column";

export interface SteamUserModel {
    readonly id: SteamId64;

    readonly username: string;

    readonly avatar: string | null;

    readonly location: string | null;

    readonly member_since: Date | null;

    readonly first_seen_at: Date | null;

    readonly last_seen_at: Date | null;

    readonly times_seen: number;
}

export async function createSteamUsersTable(): Promise<void> {
    await pg.unsafe(`
        CREATE TABLE IF NOT EXISTS steam_users (
            id ${Column.SteamId64} PRIMARY KEY,
            username VARCHAR(32) NOT NULL,
            avatar VARCHAR(128),
            location VARCHAR(32),
            member_since TIMESTAMP,
            first_seen_at TIMESTAMP,
            last_seen_at TIMESTAMP,
            times_seen INT NOT NULL DEFAULT 0
        )
    `);

    // migrations
    await Promise.all([
        pg`ALTER TABLE steam_users ADD COLUMN IF NOT EXISTS avatar VARCHAR(128)`,
        pg`ALTER TABLE steam_users ADD COLUMN IF NOT EXISTS location VARCHAR(32)`,
        pg`ALTER TABLE steam_users ADD COLUMN IF NOT EXISTS member_since TIMESTAMP`,
    ]);
}
