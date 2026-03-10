import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log } from "@/utils/logging";

export function handleBackgroundError(fn: { name: string }, error: unknown): void {
    log(`Background task ${colorize(fn.name, Color.FgRed)} errored`);
    console.error(error);
}
