import { Column } from "@/databases/utils/column";
import { pg } from "@/global/pg";
import type { DiscordId, Ip, Origin, UserAgent } from "@/shared/types/Common";
import type { SteamUserModel } from "../steamUsers/steamUserModel";

export interface UserModel {
    readonly id: DiscordId;

    readonly username: string;

    readonly avatar: string | null;

    readonly steam_id: SteamUserModel["id"] | null;

    readonly first_seen_at: Date;

    readonly last_seen_at: Date;

    readonly ip: Ip | null;

    readonly user_agent: UserAgent | null;

    readonly origin: Origin | null;

    readonly lifetime_action_count: number;
}

export async function createUsersTable(): Promise<void> {
    await pg.unsafe(`
        CREATE TABLE IF NOT EXISTS users (
            id ${Column.Snowflake} PRIMARY KEY,
            username VARCHAR(32) NOT NULL,
            avatar VARCHAR(32),
            steam_id ${Column.SteamId64} REFERENCES steam_users(id),
            first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
            last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
            ip ${Column.Ip},
            user_agent ${Column.UserAgent},
            origin ${Column.OriginUrl},
            lifetime_action_count INT NOT NULL DEFAULT 0
        )
    `);

    // migrations
    await Promise.all([
        pg`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMP NOT NULL DEFAULT NOW()`,
        pg`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP NOT NULL DEFAULT NOW()`,
        pg.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ip ${Column.Ip}`),
        pg.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_agent ${Column.UserAgent}`),
        pg.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS origin ${Column.OriginUrl}`),
        pg`ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_action_count INT NOT NULL DEFAULT 0`,
    ]);

    await pg`CREATE INDEX IF NOT EXISTS idx_users_steam_id ON users(steam_id)`;
}
