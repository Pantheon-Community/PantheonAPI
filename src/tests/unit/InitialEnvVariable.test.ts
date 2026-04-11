import { InitialEnvVariable } from "@/env/classes/InitialEnvVariable";
import { makeTempEnvVariable } from "@/tests/utils/makeTempEnvVariable";
import { describe, expect, test } from "bun:test";

describe(InitialEnvVariable.name, () => {
    describe(InitialEnvVariable.prototype.isRequired.name, () => {
        test("throws if missing", () => {
            const key = makeTempEnvVariable();

            try {
                new InitialEnvVariable(key).isRequired();

                throw new Error("Did not throw");
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                expect(error.message).toInclude("missing");
            }
        });

        test("throws if empty", () => {
            const key = makeTempEnvVariable("");

            try {
                new InitialEnvVariable(key).isRequired();

                throw new Error("Did not throw");
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                expect(error.message).toInclude("empty");
            }
        });

        test("resolves if present and non-empty", () => {
            const text = "  some value  ";

            const key = makeTempEnvVariable(text);

            const result = new InitialEnvVariable(key).isRequired();

            expect(result.value).toBe(text.trim());
        });
    });

    describe(InitialEnvVariable.prototype.hasDefaultValueOf.name, () => {
        test("uses default if missing", () => {
            const key = makeTempEnvVariable();

            const defaultValue = "default value";

            const result = new InitialEnvVariable(key).hasDefaultValueOf(defaultValue);

            expect(result.value).toBe(defaultValue);
        });

        test("uses existing value if present", () => {
            const text = "some value 3";

            const key = makeTempEnvVariable(text);

            const result = new InitialEnvVariable(key).hasDefaultValueOf("default value");

            expect(result.value).toBe(text);
        });
    });
});
