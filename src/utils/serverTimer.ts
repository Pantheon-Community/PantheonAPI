import { config } from "@/global/config";
import { Color } from "@/types/Color";
import type { Response } from "express";
import { colorize } from "./colorize";
import { log, logWithTimeTaken } from "./logging";

export class ServerTimer {
    public readonly times: [name: string, duration: number][] = [];

    public create(name: string): Disposable {
        const startTime = Date.now();

        return { [Symbol.dispose]: () => this.times.push([name, Date.now() - startTime]) };
    }

    public addTo(res: Response): void {
        if (res.headersSent) {
            log(`Timer.addTo was called but headers were already sent!`);
            return;
        }

        if (this.times.length === 0) {
            return;
        }

        const output: string[] = [];

        for (const [name, duration] of this.times) {
            output.push(`${name};dur=${duration}`);
        }

        res.setHeader("Server-Timing", output.join(","));
    }
}

if (config.dev.logTimers) {
    // oxlint-disable-next-line typescript/unbound-method
    const originalCreate = ServerTimer.prototype.create;

    // oxlint-disable-next-line typescript/unbound-method
    const originalAddTo = ServerTimer.prototype.addTo;

    ServerTimer.prototype.create = function create(name): Disposable {
        const startedAt = Date.now();

        name = colorize(name, Color.FgCyan);

        const result = originalCreate.apply(this, [name]);

        log(`${name} Started`);

        return {
            [Symbol.dispose]: () => {
                result[Symbol.dispose]();
                logWithTimeTaken(`${name} Finished`, startedAt);
            },
        };
    };

    ServerTimer.prototype.addTo = function addTo(res: Response): void {
        originalAddTo.apply(this, [res]);

        log(`${colorize(`${res.req.method} ${res.req.url}`, Color.FgMagenta)} Finished`);
    };
}
