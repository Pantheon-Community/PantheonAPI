import { config } from "@/global/config";
import { setPg } from "@/global/pg";
import { createCompletedTransactionsTable } from "@/models/CompletedTransactionModel";
import { createEarningsTable } from "@/models/EarningsModel";
import { createEconomyRewardItemsTable } from "@/models/EconomyRewardItemModel";
import { createEconomyRewardsTable } from "@/models/EconomyRewardModel";
import { createPendingTransactionsTable } from "@/models/PendingTransactionModel";
import { createPluginTokensTable } from "@/models/PluginTokenModel";
import { createRolesTable } from "@/models/RoleModel";
import { createSteamUsersTable } from "@/models/SteamUserModel";
import { createUsersTable } from "@/models/UserModel";
import { createUserRolesTable } from "@/models/UserRoleModel";
import { createUserSessionsTable } from "@/models/UserSessionModel";
import { deleteExpiredUserSessions } from "@/tasks/deleteExpiredUserSessions";
import { Color } from "@/types/Color";
import type { TeardownFn } from "@/types/TeardownFn";
import { colorize } from "@/utils/colorize";
import { log, logWithTimeTaken } from "@/utils/logging";
import { SQL } from "bun";
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

                case ConnectionStatus.Disconnected:
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

    await createSteamUsersTable();

    await createUsersTable();

    await Promise.all([
        createUserSessionsTable(),
        createRolesTable().then(createUserRolesTable),
        createEconomyRewardsTable().then(() =>
            Promise.all([
                createEconomyRewardItemsTable(),
                createPendingTransactionsTable(),
                createCompletedTransactionsTable(),
            ]),
        ),
        createPluginTokensTable().then(createEarningsTable),
    ]);

    logWithTimeTaken("Setup Database Tables", startedAt);
}

async function scheduleTasks(): Promise<void> {
    Bun.cron("@daily", deleteExpiredUserSessions);

    if (config.dev.immediateSchedules) {
        await deleteExpiredUserSessions();
    }
}

export async function startPostgres(): Promise<TeardownFn> {
    const teardownFn = await connectToPostgres();

    await setupTables();
    await scheduleTasks();

    return teardownFn;
}
