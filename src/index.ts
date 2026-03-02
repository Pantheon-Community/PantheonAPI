import { config } from "./global/config";
import { startApi } from "./start/startApi";
import { startPostgres } from "./start/startPostgres";
import { Color } from "./types/Color";
import { colorize } from "./utils/colorize";
import { log } from "./utils/logging";

const commit = config.commitHash ? colorize(config.commitHash.slice(0, 7), Color.FgCyan) : null;

const environment = colorize(config.environment, Color.FgCyan);

if (config !== null) {
	log(`Running in ${environment} (commit ${commit})`);
} else {
	log(`Running in ${environment}`);
}

await Promise.all([startPostgres(), startApi()]);
