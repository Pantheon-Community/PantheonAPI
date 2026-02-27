import { pg } from "@/global/pg";

export async function createSessionTable(): Promise<void> {
	await pg`
        CREATE TABLE IF NOT EXISTS sessions (
            access_token VARCHAR(64) PRIMARY KEY,
            refresh_token VARCHAR(64) NOT NULL,
            started_at TIMESTAMP NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL,
            times_refreshed INT NOT NULL DEFAULT 0,
            user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            ip VARCHAR(32) NOT NULL,
            user_agent VARCHAR(255) NOT NULL
        )
    `;

	await pg`ALTER TABLE sessions ALTER COLUMN ip DROP DEFAULT`;
	await pg`ALTER TABLE sessions ALTER COLUMN user_agent DROP DEFAULT`;
}
