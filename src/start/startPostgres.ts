import { pendingTransactionsDb } from "@/databases/pendingTransactions";
import { rewardsDb } from "@/databases/rewards";
import { rolesDb } from "@/databases/roles";
import { steamUsersDb } from "@/databases/steamUsers";
import { tokensDb } from "@/databases/tokens";
import { userRolesDb } from "@/databases/userRoles";
import { usersDb } from "@/databases/users";
import { userSessionsDb } from "@/databases/userSessions";
import { config } from "@/global/config";
import { setPg } from "@/global/pg";
import { userSessionExpirationTask } from "@/tasks/userSessionExpirationTask";
import { Color } from "@/types/Color";
import type { TeardownFn } from "@/types/TeardownFn";
import { colorize } from "@/utils/colorize";
import { log, logWithTimeTaken } from "@/utils/logging";
import { SQL } from "bun";
import { schedule } from "node-cron";
import process from "node:process";

enum ConnectionStatus {
    Attempting,

    Connected,

    Disconnected,
}

async function connectToPostgres(): Promise<TeardownFn> {
    const { hostname, port, database, username, password } = config.db;

    const startedAt = Date.now();

    // Logging In

    let connectionStatus = ConnectionStatus.Attempting;

    let isClosingIntentionally = false;

    const pg = new SQL({
        hostname,
        port,
        database,
        username,
        password,

        onconnect: (): void => {
            if (connectionStatus === ConnectionStatus.Connected) return;

            connectionStatus = ConnectionStatus.Connected;

            logWithTimeTaken("Connected to PostgreSQL", startedAt);
        },

        onclose: (error: Error | null): void => {
            if (isClosingIntentionally) return;

            switch (connectionStatus) {
                case ConnectionStatus.Attempting:
                    log(colorize("Failed to connect to PostgreSQL", Color.FgRed));
                    console.error(error);
                    break;
                case ConnectionStatus.Connected:
                    log(colorize("Disconnected from PostgreSQL", Color.FgRed));
                    console.error(error);
                    break;
                default:
                    return;
            }

            connectionStatus = ConnectionStatus.Disconnected;

            process.exit(1);
        },
    });

    setPg(pg);

    await pg.connect();

    return async (receivedAt) => {
        isClosingIntentionally = true;

        await pg.close();

        logWithTimeTaken(`Disconnected from PostgreSQL`, receivedAt);
    };
}

async function setupTables(): Promise<void> {
    const startedAt = Date.now();

    await steamUsersDb.setup();

    await usersDb.setup();

    await Promise.all([
        userSessionsDb.setup(),
        rolesDb.setup(),
        tokensDb.setup(),
        rewardsDb.setup(),
    ]);

    await Promise.all([userRolesDb.setup(), pendingTransactionsDb.setup()]);

    logWithTimeTaken("Setup Database Tables", startedAt);
}

async function scheduleTasks(): Promise<void> {
    schedule("0 0 * * *", userSessionExpirationTask);

    if (config.dev.immediateSchedules) {
        await userSessionExpirationTask();
    }
}

export async function startPostgres(): Promise<TeardownFn> {
    const teardownFn = await connectToPostgres();
    await setupTables();
    await scheduleTasks();

    return teardownFn;
}
