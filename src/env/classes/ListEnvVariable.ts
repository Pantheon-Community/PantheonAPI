import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { irregularPluralize } from "@/utils/pluralize";
import { KnownEnvVariable } from "./KnownEnvVariable";

export class ListEnvVariable<T> extends KnownEnvVariable<T[]> {
    /** Ensures this list contains at least {@link length} entries. */
    public minLength(length: number): this {
        if (this.value.length < length) {
            const xEntries = irregularPluralize(length, "entry", "entries");

            throw new Error(`${this.named()} must have at least ${xEntries}`);
        }

        return this;
    }

    /** Ensures this list contains at most {@link length} entries. */
    public maxLength(length: number): this {
        if (this.value.length > length) {
            const xEntries = irregularPluralize(length, "entry", "entries");

            throw new Error(`${this.named()} cannot have more than ${xEntries}`);
        }

        return this;
    }

    /** Ensures this list contains no duplicate entries. */
    public hasUniqueEntries(): this {
        const seen = new Set<T>();

        for (let i = 0; i < this.value.length; i++) {
            const entry = this.value[i];

            if (seen.has(entry)) {
                throw new Error(
                    `${this.named()} contains duplicate a entry at index ${i}: ${colorize(String(entry), Color.FgRed)}`,
                );
            }

            seen.add(entry);
        }

        return this;
    }

    /** Ensures each entry in this list passes some custom validation logic. */
    public each<T2>(fn: (entry: T, index: number, array: T[]) => T2): this {
        this.value.map(fn);

        return this;
    }

    /** Like {@link each} but returns a new, mapped instance. */
    public map<T2>(fn: (entry: T, index: number, array: T[]) => T2): ListEnvVariable<T2> {
        return new ListEnvVariable(this.key, this.value.map(fn));
    }

    /** Converts this list into a set. */
    public toSet(): KnownEnvVariable<Set<T>> {
        return new KnownEnvVariable(this.key, new Set(this.value));
    }
}
