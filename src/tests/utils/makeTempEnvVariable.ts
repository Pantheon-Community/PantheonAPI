import process from "node:process";

let count = 0;

export function makeTempEnvVariable(value?: string): `TEST_ENV_VAR_${number}` {
	const key = `TEST_ENV_VAR_${count++}` as const;

	if (value !== undefined) {
		process.env[key] = value;
	}

	return key;
}
