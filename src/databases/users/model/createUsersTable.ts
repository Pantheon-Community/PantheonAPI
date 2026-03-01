import { Column } from "@/databases/utils/column";
import { pg } from "@/global/pg";

export async function createUsersTable(): Promise<void> {
	await pg.unsafe(`
        CREATE TABLE IF NOT EXISTS users (
            id ${Column.Snowflake} PRIMARY KEY,
            username VARCHAR(32) NOT NULL,
            avatar VARCHAR(32),
            steam_id ${Column.SteamId64} REFERENCES steam_users(id)
        )
    `);
}
