import { Column } from "@/databases/utils/column";
import { pg } from "@/global/pg";

export async function createUserSessionsTable(): Promise<void> {
	await pg.unsafe(`
        CREATE TABLE IF NOT EXISTS user_sessions (
            access_token ${Column.Token} PRIMARY KEY,
            refresh_token ${Column.Token} NOT NULL,
            started_at TIMESTAMP NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL,
            times_refreshed INT NOT NULL DEFAULT 0,
            user_id ${Column.Snowflake} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            ip ${Column.Ip} NOT NULL,
            user_agent ${Column.UserAgent} NOT NULL,
            action_count INT NOT NULL DEFAULT 0,
            last_action_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);

	// TODO: searching sessions via user id
	await pg`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`;
}
