/** Inserts dummy users and steam users into the database. */

import { pg } from "@/global/pg";
import { type SteamUserModel } from "@/models/SteamUserModel";
import { type UserModel } from "@/models/UserModel";
import type { DiscordId, Ip } from "@/shared/types/Common";
import type { SteamId64 } from "@/shared/types/SteamUser";
import { startPostgres } from "@/start/startPostgres";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { logWithTimeTaken } from "@/utils/logging";
import { sql } from "bun";

await startPostgres();

const startTimeSteamUsers = Date.now();

function generateId<T extends SteamId64 | DiscordId>(x: number): T {
    return `seed-${x.toString().padStart(13, "0")}` as T;
}

const steamUsers = new Array(100).fill(null).map((_, i) => {
    const output: Partial<SteamUserModel> = {
        id: generateId(i),
        username: `Steam User #${i + 1}`,
    };

    switch (i % 3) {
        case 0:
            output.location = "New Zealand";
            break;
        case 1:
            output.location = "Australia";
            break;
    }

    if (i % 10 !== 0) {
        output.member_since = new Date(Date.now() - 1000 * 60 * 60 * 24 * (i % 10));
    }

    if (i % 5 === 0) {
        output.first_seen_at = new Date(Date.now() - 1000 * 60 * 60 * 24 * (i % 2));
        output.last_seen_at = new Date(Date.now() - 1000 * 60 * 60 * 12 * (i % 2));
        output.times_seen = i;
    } else {
        output.times_seen = 0;
    }

    return output;
});

await pg`INSERT INTO steam_users ${sql(steamUsers)} ON CONFLICT (id) DO NOTHING`;

logWithTimeTaken(
    `Seeded ${colorize(`${steamUsers.length} Steam Users`, Color.FgCyan)}`,
    startTimeSteamUsers,
);

const startTimeUsers = Date.now();

const users = new Array(100).fill(null).map((_, i) => {
    const output: Partial<UserModel> = {
        id: generateId(i),
        username: `Discord User #${i + 1}`,
        first_seen_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * (i % 10)),
        last_seen_at: new Date(Date.now() - 1000 * 60 * 60 * 12 * (i % 10)),
        lifetime_action_count: i,
        balance: (10 * i) % 100,
        lifetime_balance: (20 * i) % 100,
        lifetime_purchase_count: (2 * i) % 3,
    };

    if (i % 2 === 0) output.steam_id = steamUsers[i]!.id!;
    if (i % 3 !== 0) output.ip = "123.123.123.123" as Ip;

    return output;
});

await pg`INSERT INTO users ${sql(users)} ON CONFLICT (id) DO NOTHING`;

logWithTimeTaken(`Seeded ${colorize("100 Users", Color.FgCyan)}`, startTimeUsers);
