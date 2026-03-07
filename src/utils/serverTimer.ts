import { config } from "@/global/config";
import { Color } from "@/types/Color";
import type { Response } from "express";
import { colorize } from "./colorize";
import { log, logWithTimeTaken } from "./logging";

export class ServerTimer {
    private readonly times: [name: string, duration: number][] = [];

    public create(...fns: { name: string }[]): Disposable {
        const startTime = Date.now();

        const name = fns.map((x) => x.name).join("+");

        return {
            [Symbol.dispose]: () => {
                const endTime = Date.now();

                this.times.push([name, endTime - startTime]);
            },
        };
    }

    public addTo<T extends Response>(res: T): T {
        if (res.headersSent) {
            log(`Timer.${this.addTo.name} was called but headers were already sent!`);
            return res;
        }

        if (this.times.length === 0) {
            log(`Timer.${this.addTo.name} was called but had no recorded times!`);
            return res;
        }

        const output: string[] = [];

        for (const [name, duration] of this.times) {
            output.push(`${name};dur=${duration}`);
        }

        res.setHeader("Server-Timing", output.join(","));

        return res;
    }
}

if (config.dev.logTimers) {
    // oxlint-disable-next-line typescript/unbound-method
    const originalCreate = ServerTimer.prototype.create;

    // oxlint-disable-next-line typescript/unbound-method
    const originalAddTo = ServerTimer.prototype.addTo;

    ServerTimer.prototype.create = function create(...args): Disposable {
        const startedAt = Date.now();

        const name = colorize(args.map((x) => x.name).join("+"), Color.FgCyan);

        const result = originalCreate.apply(this, args);

        log(`${name} Started`);

        return {
            [Symbol.dispose]: (): void => {
                result[Symbol.dispose]();
                logWithTimeTaken(`${name} Finished`, startedAt);
            },
        };
    };

    ServerTimer.prototype.addTo = function addTo<T extends Response>(res: T): T {
        originalAddTo.apply(this, [res]);

        log(`${colorize(`${res.req.method} ${res.req.url}`, Color.FgMagenta)} Finished`);

        return res;
    };
}
