import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { pluralize } from "@/utils/pluralize";
import { KnownEnvVariable } from "./KnownEnvVariable";
import { ListEnvVariable } from "./ListEnvVariable";
import { NumericEnvVariable } from "./NumericEnvVariable";

export class StringEnvVariable extends KnownEnvVariable<string> {
    /** Ensures this string is not equal to another. */
    public cannotBe(forbiddenValue: string, errorMessage: string): this {
        if (this.value === forbiddenValue) {
            const thisValue = colorize(forbiddenValue, Color.FgRed);

            throw new Error(`${this.named()} cannot be ${thisValue} - ${errorMessage}`);
        }

        return this;
    }

    /** Ensures this string is at least {@link length} characters long. */
    public minLength(length: number): this {
        if (this.value.length < length) {
            const xCharacters = pluralize(length, "character");

            throw new Error(`${this.named()} cannot be less than ${xCharacters} long`);
        }

        return this;
    }

    /** Ensures this string is at most {@link length} characters long. */
    public maxLength(length: number): this {
        if (this.value.length > length) {
            const xCharacters = pluralize(length, "character");

            throw new Error(`${this.named()} cannot be more than ${xCharacters} long`);
        }

        return this;
    }

    /** Ensures this string can be parsed to a valid integer. */
    public isInteger(): NumericEnvVariable {
        const parsed = Number(this.value);

        if (!Number.isSafeInteger(parsed)) {
            throw new Error(`${this.named()} is not a valid integer`);
        }

        return new NumericEnvVariable(this.key, parsed);
    }

    /**
     * Ensures this string can be parsed into a valid TCP/UDP port.
     *
     * This supports Docker container syntax (host:container) for port definitions.

	 * @example "5000"
	 * @example "3000:5000"
	 */
    public isPort(): NumericEnvVariable {
        let value = this.value;

        // ignore host port if in a container.
        if (value.includes(":")) {
            value = value.split(":").at(-1) ?? this.value;
        }

        // TCP/UDP ports are 16-bit unsigned integers, so:
        // min value = 0 (signifies a dynamically assigned port)
        // max value = 2 ^ 16 - 1 = 65535
        return new StringEnvVariable(this.key, value).isInteger().minValue(0).maxValue(65_535);
    }

    /** Ensures this string can be parsed into a comma-separated list of strings. */
    public isCommaSeparatedList(): ListEnvVariable<StringEnvVariable> {
        const values = this.value
            .split(",")
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
            .map((value, index) => new StringEnvVariable(`${this.key}[${index}]`, value));

        return new ListEnvVariable(this.key, values);
    }

    /** Ensures this string can be parsed into a valid URL. */
    public isUrl(): this {
        if (!URL.canParse(this.value)) {
            throw new Error(`${this.named()} is not a valid URL`);
        }

        return this;
    }

    /** Ensures this string can be parsed into a valid URL, including the wildcard ("*") URL. */
    public isUrlOrWildcard(): this {
        if (this.value !== "*") {
            return this.isUrl();
        }

        return this;
    }

    /** Ensures this string can be parsed to a valid boolean value. */
    public isBoolean(): KnownEnvVariable<boolean> {
        switch (this.value.toLowerCase()) {
            case "true":
                return new KnownEnvVariable(this.key, true);
            case "false":
                return new KnownEnvVariable(this.key, false);
            default:
                throw new Error(`${this.named()} must be either "true" or "false"`);
        }
    }
}
