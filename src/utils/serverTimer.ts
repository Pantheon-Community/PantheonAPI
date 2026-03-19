import { config } from "@/global/config";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log, logWithTimeTaken } from "@/utils/logging";
import type { Response } from "express";

export class ServerTimer {
    public readonly times: [name: string, duration: number][] = [];

    private latestStartTime: number = 0;

    private curIndex: number = 0;

    public create(name: string): Disposable {
        const startTime = Date.now();

        if (startTime > this.latestStartTime) {
            this.latestStartTime = startTime;
            this.curIndex++;
        }

        name = `${this.curIndex}_${name}`;

        return { [Symbol.dispose]: () => this.times.push([name, Date.now() - startTime]) };
    }

    public addTo(res: Response): void {
        if (res.headersSent) {
            log(`Timer.addTo was called but headers were already sent!`);
            return;
        }

        const len = this.times.length;

        if (len === 0) {
            return;
        }

        const output = new Array<string>(len);

        for (let i = 0; i < len; i++) {
            const [name, duration] = this.times[i]!;
            output[i] = `${name};dur=${duration}`;
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

        const result = originalCreate.apply(this, [name]);

        log(`${colorize(name, Color.FgCyan)} Started`);

        return {
            [Symbol.dispose]: () => {
                result[Symbol.dispose]();
                logWithTimeTaken(`${colorize(name, Color.FgCyan)} Finished`, startedAt);
            },
        };
    };

    ServerTimer.prototype.addTo = function addTo(res: Response): void {
        originalAddTo.apply(this, [res]);

        log(`${colorize(`${res.req.method} ${res.req.url}`, Color.FgMagenta)} Finished`);
    };
}
