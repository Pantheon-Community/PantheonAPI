import { KnownEnvVariable } from "./KnownEnvVariable";

export class NumericEnvVariable extends KnownEnvVariable<number> {
	/** Converts this number to {@link Number.POSITIVE_INFINITY infinity} if it is equal to 0. */
	public zeroMeansInfinity(): NumericEnvVariable {
		if (this.value === 0) {
			return new NumericEnvVariable(this.key, Number.POSITIVE_INFINITY);
		}

		return this;
	}

	/** Ensures this number is not less than {@link min}. */
	public minValue(min: number): this {
		if (this.value < min) {
			throw new Error(`${this.named()} cannot be less than ${min.toLocaleString()}`);
		}

		return this;
	}

	/** Ensures that this number is not greater than {@link max}. */
	public maxValue(max: number): this {
		if (this.value > max) {
			throw new Error(`${this.named()} cannot be greater than ${max.toLocaleString()}`);
		}

		return this;
	}
}
