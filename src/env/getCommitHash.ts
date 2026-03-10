import { execSync } from "node:child_process";
import process from "node:process";

/**
 * Attempts to get the current git commit hash.
 *
 * @example "8336a7b"
 */
export function getCommitHash(): string | null {
    const fromEnv = process.env["GIT_COMMIT_HASH"];

    if (fromEnv !== undefined && fromEnv.trim().length > 0) {
        return fromEnv.trim();
    }

    try {
        return (
            execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
                .toString()
                .trim() || null
        );
    } catch {
        return null;
    }
}
