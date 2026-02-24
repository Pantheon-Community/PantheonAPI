import { execSync } from "node:child_process";

/**
 * Attempts to get the current git commit hash.
 *
 * @example "8336a7b15e35038f8dae693f4f2d46acd374ad0f"
 */
export function getCommitHash(): string | null {
	try {
		return (
			execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
				.toString()
				.trim() || null
		);
	} catch {
		return null;
	}
}
