import { SQL } from "bun";

/** Bun's PostgresError objects don't include the full stacktrace. */
export function wrapPgError(error: unknown): unknown {
    if (!(error instanceof SQL.PostgresError)) {
        return error;
    }

    return new Error(error.message, { cause: error });
}
