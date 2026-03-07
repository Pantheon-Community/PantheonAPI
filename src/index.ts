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

await Promise.all([startPostgres(), startApi()]);
