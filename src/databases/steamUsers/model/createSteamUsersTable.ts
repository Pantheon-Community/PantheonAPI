import { Column } from "@/databases/utils/column";
import { pg } from "@/global/pg";

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

	// TODO: searching steam users via username
	await pg`CREATE INDEX IF NOT EXISTS idx_steam_users_username ON steam_users(username)`;
}
