import { pg } from "@/global/pg";

export async function createUserTable(): Promise<void> {
	await pg`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(32) PRIMARY KEY,
            username VARCHAR(32) NOT NULL,
            avatar VARCHAR(32),
            latest_ip VARCHAR(32) NOT NULL,
            session_count INT NOT NULL DEFAULT 0,
            steam_id VARCHAR(32),
            steam_username VARCHAR(32),
            first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
            last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
            first_seen_at_steam TIMESTAMP,
            last_seen_at_steam TIMESTAMP,
            general_permissions INT NOT NULL DEFAULT 0,
            economy_permissions INT NOT NULL DEFAULT 0
        )
    `;
}
