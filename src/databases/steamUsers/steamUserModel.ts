import { pg } from "@/global/pg";
import type { SteamId64 } from "@/shared/types/Common";
import { Column } from "../utils/column";

export interface SteamUserModel {
    readonly id: SteamId64;

    readonly username: string;

    readonly first_seen_at: Date | null;

    readonly last_seen_at: Date | null;

    readonly times_seen: number;
}

export async function createSteamUsersTable(): Promise<void> {
    await pg.unsafe(`
        CREATE TABLE IF NOT EXISTS steam_users (
            id ${Column.SteamId64} PRIMARY KEY,
            username VARCHAR(32) NOT NULL,
            first_seen_at TIMESTAMP,
            last_seen_at TIMESTAMP,
            times_seen INT NOT NULL DEFAULT 0
        )
    `);
}
