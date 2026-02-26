import type { Response } from "express";

export class ServerTimer {
	private readonly startTime: number = Date.now();

	private readonly times: { name: string; finishedAt: number }[] = [];

	// biome-ignore lint/suspicious/noExplicitAny: unknown doesn't work here
	public finished(...fns: ((...args: any[]) => Promise<unknown>)[]): void {
		this.times.push({ name: fns.map((x) => x.name).join("+"), finishedAt: Date.now() });
	}

	public addTo(res: Response): void {
		if (res.headersSent || this.times.length === 0) {
			return;
		}

		const output: string[] = [];

		const { name: firstName, finishedAt: firstFinishedAt } = this.times[0];

		output.push(`${firstName};dur=${firstFinishedAt - this.startTime}`);

		for (let i = 1; i < this.times.length; i++) {
			const { name, finishedAt } = this.times[i];

			output.push(`${name};dur=${finishedAt - this.times[i - 1].finishedAt}`);
		}

		res.setHeader("Server-Timing", output.join(","));
	}
}
