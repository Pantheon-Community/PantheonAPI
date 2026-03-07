import { Column } from "@/databases/utils/column";
import { pg } from "@/global/pg";
import type {
    DiscordId,
    Ip,
    Origin,
    UserAgent,
    UserSessionId,
    UserToken,
} from "@/shared/types/Common";

export interface UserSessionModel {
    readonly access_token: UserToken;

    readonly refresh_token: UserToken;

    readonly id: UserSessionId;

    readonly started_at: Date;

    readonly expires_at: Date;

    readonly times_refreshed: number;

    readonly user_id: DiscordId;

    readonly ip: Ip | null;

    readonly user_agent: UserAgent | null;

    readonly origin: Origin | null;

    readonly action_count: number;

    readonly last_action_at: Date;
}

export async function createUserSessionsTable(): Promise<void> {
    await pg.unsafe(`
        CREATE TABLE IF NOT EXISTS user_sessions (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            access_token ${Column.Token} NOT NULL UNIQUE,
            refresh_token ${Column.Token} NOT NULL,
            started_at TIMESTAMP NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL,
            times_refreshed INT NOT NULL DEFAULT 0,
            user_id ${Column.Snowflake} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            ip ${Column.Ip},
            user_agent ${Column.UserAgent},
            origin ${Column.OriginUrl},
            action_count INT NOT NULL DEFAULT 0,
            last_action_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);

    await Promise.all([
        pg`CREATE INDEX IF NOT EXISTS idx_user_sessions_access_token ON user_sessions(access_token)`,
        pg`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)`,
        pg`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`,
    ]);
}
