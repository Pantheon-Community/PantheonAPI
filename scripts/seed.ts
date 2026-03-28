import { steamUsersDb } from "@/databases/steamUsers";
import { usersDb } from "@/databases/users";
import type { DiscordId, Ip } from "@/shared/types/Common";
import type { SteamId64, SteamUserWithTimes } from "@/shared/types/SteamUser";
import type { UserBasic } from "@/shared/types/User";
import { startPostgres } from "@/start/startPostgres";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { logWithTimeTaken } from "@/utils/logging";
import { ServerTimer } from "@/utils/serverTimer";

await startPostgres();

const steamStartTime = Date.now();

const steamUserPromises = new Array<Promise<SteamUserWithTimes>>(100);

function generateId<T extends SteamId64 | DiscordId>(x: number): T {
    return `seed-${x.toString().padStart(13, "0")}` as T;
}

for (let i = 0; i < 100; i++) {
    steamUserPromises[i] = new Promise((resolve) => {
        steamUsersDb
            .addFromDiscordConnection(
                {
                    id: generateId(i),
                    username: `Steam User #${i + 1}`,
                },
                {
                    avatar: null,
                    location: ["New Zealand", "Australia", null][i % 3]!,
                    memberSince: new Date(Date.now() - 1000 * 60 * 60 * 24 * (i % 10)),
                },
            )
            .then(resolve)
            .catch(console.error);
    });
}

const steamUsers = await Promise.all(steamUserPromises);

logWithTimeTaken(
    `Seeded ${colorize(`${steamUsers.length} Steam Users`, Color.FgCyan)}`,
    steamStartTime,
);

const userStartTime = Date.now();

const userPromises = new Array<Promise<UserBasic>>(100);

for (let i = 0; i < 100; i++) {
    userPromises[i] = new Promise((resolve) => {
        usersDb
            .addOrUpdateUser(
                {
                    id: generateId(i),
                    avatar: null,
                    global_name: null,
                    username: `Discord User #${i + 1}`,
                },
                i % 2 === 0 ? steamUsers[i]!.id : undefined,
                {
                    ip: i % 3 === 0 ? null : ("123.123.123.123" as Ip),
                    origin: null,
                    userAgent: null,
                },
                new ServerTimer(),
            )
            .then((x) => resolve(x.upsertedUser))
            .catch(console.error);
    });
}

const users = await Promise.all(userPromises);

logWithTimeTaken(`Seeded ${colorize(`${users.length} Users`, Color.FgCyan)}`, userStartTime);
