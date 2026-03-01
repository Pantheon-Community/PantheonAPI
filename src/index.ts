import { config } from "./global/config";
import { startApi } from "./start/startApi";
import { startPostgres } from "./start/startPostgres";
import { Color } from "./types/Color";
import { colorize } from "./utils/colorize";
import { log } from "./utils/logging";

if (config.environment) {
	log(`Running in ${colorize(config.environment, Color.FgCyan)}`);
}

await Promise.all([startPostgres(), startApi()]);
