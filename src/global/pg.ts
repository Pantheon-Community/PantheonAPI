import { SQL } from "bun";

let postgres: SQL;

export function setPostgres(value: SQL): void {
    postgres = value;
}

export async function pg<T = any>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T> {
    try {
        return await postgres(strings, ...values);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(error.message, { cause: error });
        }

        throw error;
    }
}

/** Used for table initialisation only! */
export async function pgUnsafe(value: string): Promise<void> {
    try {
        await postgres.unsafe(value);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(error.message, { cause: error });
        }

        throw error;
    }
}
