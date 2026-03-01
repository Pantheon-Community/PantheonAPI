import { Column } from "@/databases/utils/column";
import { pg } from "@/global/pg";

export async function createUserAnalyticsTable(): Promise<void> {
	await pg.unsafe(`
        CREATE TABLE IF NOT EXISTS user_analytics (
            id ${Column.Snowflake} PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
            last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
            ip ${Column.Ip} NOT NULL,
            user_agent ${Column.UserAgent} NOT NULL,
            lifetime_action_count INT NOT NULL DEFAULT 0
        )
    `);
}
