import process from "node:process";
import { config } from "./global/config";
import { startApi } from "./start/startApi";
import { startPostgres } from "./start/startPostgres";
import { Color } from "./types/Color";
import { colorize } from "./utils/colorize";
import { log } from "./utils/logging";

const environment = colorize(config.environment, Color.FgCyan);

if (config.commitHash === null) {
    log(`Running in ${environment}`);
} else {
    const commit = colorize(config.commitHash, Color.FgCyan);

    log(`Running in ${environment} (commit ${commit})`);
}

const teardownFns = await Promise.all([startPostgres(), startApi()]);

process.on("SIGTERM", async () => {
    const receivedAt = Date.now();

    log(`SIGTERM signal received`);

    await Promise.all(teardownFns.map((x) => x(receivedAt)));

    log(`Goodbye!`);

    process.exit(0);
});
