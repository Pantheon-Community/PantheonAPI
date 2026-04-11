import { pg } from "@/global/pg";
import type {
    DiscordId,
    Ip,
    Origin,
    UserAgent,
    UserAgentHint,
    UserToken,
} from "@/shared/types/Common";

export interface UserSessionModel {
    id: string;

    user_id: DiscordId;

    access_token: UserToken;

    refresh_token: UserToken;

    started_at: Date;

    expires_at: Date;

    times_refreshed: number;

    action_count: number;

    last_action_at: Date;

    ip: Ip | null;

    user_agent: UserAgent | null;

    user_agent_hint: UserAgentHint | null;

    origin: Origin | null;
}

export async function createUserSessionsTable(): Promise<void> {
    await pg`
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            access_token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            started_at TIMESTAMP NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL,
            times_refreshed INTEGER NOT NULL DEFAULT 0,
            action_count INTEGER NOT NULL DEFAULT 0,
            last_action_at TIMESTAMP NOT NULL DEFAULT NOW(),
            ip TEXT,
            user_agent TEXT,
            user_agent_hint TEXT,
            origin TEXT
        );

        CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id);
        CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions (expires_at);
    `.simple();
}
