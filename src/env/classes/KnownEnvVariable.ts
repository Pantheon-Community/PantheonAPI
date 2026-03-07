import { BaseEnvVariable } from "./BaseEnvVariable";

/**
 * Wrapper class for a value that has been read from `process.env` and definitely exists.
 *
 * These are made after validating an **InitialEnvVariable**.
 */
export class KnownEnvVariable<T> extends BaseEnvVariable {
    public readonly value: T;

    public constructor(key: string, value: T) {
        super(key);
        this.value = value;
    }

    /** Ensures this value passes some custom validation logic. */
    public errorIf(condition: (value: T) => boolean, message: string): this {
        if (condition(this.value)) {
            throw new Error(`${this.named()} ${message}`);
        }

        return this;
    }
}
