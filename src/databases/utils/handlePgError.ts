import { SQL } from "bun";

/** Bun's PostgresError objects don't include a full stacktrace */
export function wrapPgError(error: unknown): unknown {
    if (error instanceof SQL.PostgresError) {
        return new Error(error.message, { cause: error });
    }

    return error;
}
