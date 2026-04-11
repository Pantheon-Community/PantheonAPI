import type { OAS } from "@/shared/global/OAS";
import { validateArray } from "@/shared/spec/validators/array";
import { validateObject } from "@/shared/spec/validators/object";
import type { SpecObject, SpecObjectFor } from "@/shared/types/Util";

export function makeArray(
    specObject: SpecObject,
    minLength: number = 0,
    maxLength: number = Number.MAX_SAFE_INTEGER,
): SpecObject {
    const output: SpecObject = {
        schema: {
            type: "array",
            items: specObject.schema,
        },
        validate: (input) => {
            validateArray(input, minLength, maxLength, specObject.validate.bind(specObject));
        },
    };

    if (minLength !== 0) {
        output.schema.minItems = minLength;
    }

    if (maxLength !== Number.MAX_SAFE_INTEGER) {
        output.schema.maxItems = maxLength;
    }

    return output;
}

export function makeParams<T extends Record<string, unknown>>(
    spec: Record<keyof T, SpecObject>,
): SpecObjectFor<T> {
    const properties = {} as Record<keyof T, OAS.Schema>;
    const subValidators = {} as Record<keyof T, (input: unknown) => void>;
    const required: string[] = [];

    for (const [key, value] of Object.entries(spec) as [keyof T, SpecObject][]) {
        properties[key] = value.schema;
        subValidators[key] = value.validate.bind(value);
        required.push(key.toString());
    }

    return {
        schema: {
            type: "object",
            properties,
            required,
            additionalProperties: false,
        },
        validate(input) {
            validateObject(input, this);
        },
        subValidators,
    };
}
