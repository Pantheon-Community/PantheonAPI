import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log } from "@/utils/logging";

export function doInBackground<Args extends unknown[]>(
    task: (...taskArgs: Args) => Promise<unknown>,
    ...args: Args
): void {
    task(...args).catch((error) => {
        log(`Background task ${colorize(task.name, Color.FgRed)} errored`);
        console.error(error);
    });
}
