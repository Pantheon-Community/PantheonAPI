import type { Response } from "express";
import { config } from "@/global/config";
import { Color } from "@/types/Color";
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
	const original = ServerTimer.prototype.create;

	ServerTimer.prototype.create = function (...args) {
		const startedAt = Date.now();

		const name = colorize(args.map((x) => x.name).join("+"), Color.FgCyan);

		const result = original.apply(this, args);

		log(`${name} Started`);

		return {
			[Symbol.dispose]: () => {
				result[Symbol.dispose]();
				logWithTimeTaken(`${name} Finished`, startedAt);
			},
		};
	};
}
