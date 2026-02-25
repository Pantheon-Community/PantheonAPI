import type { Response } from "express";

export class TimerBuilder<Key extends string | never = never> {
	public readonly descriptions: Record<Key, string>;

	public constructor(descriptions: Record<Key, string>) {
		this.descriptions = descriptions;
	}

	public makeInstance(): Timer<Key> {
		return new Timer(this);
	}
}

class Timer<Key extends string> {
	private readonly builder: TimerBuilder<Key>;

	private readonly started = new Map<Key, number>();

	private readonly stopped = new Map<Key, number>();

	public constructor(builder: TimerBuilder<Key>) {
		this.builder = builder;
	}

	public start(key: Key): this {
		if (this.started.has(key)) {
			throw new Error(`Tried to start a timer twice: ${key}`);
		}

		this.started.set(key, Date.now());

		return this;
	}

	public stop(key: Key): this {
		if (this.stopped.has(key)) {
			throw new Error(`Tried to stop a timer twice: ${key}`);
		}

		const startTime = this.started.get(key);

		if (startTime === undefined) {
			throw new Error(`Tried to stop a timer that hasn't been started: ${key}`);
		}

		this.started.delete(key);
		this.stopped.set(key, Date.now() - startTime);

		return this;
	}

	public addTo(res: Response): void {
		if (this.started.size > 0) {
			throw new Error(
				`Unstopped timers detected: ${this.started.keys().toArray().join(", ")}`,
			);
		}

		const values: string[] = [];

		for (const [name, durationMs] of this.stopped) {
			values.push(`${name};desc="${this.builder.descriptions[name]}";dur=${durationMs}`);
		}

		res.setHeader("Server-Timing", values.join(","));
	}
}
