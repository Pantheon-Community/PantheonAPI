import type { OAS } from "@/shared/global/OAS";
import type { SpecObject } from "@/shared/types/Util";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import type { Request } from "express";

type TransformFn = (input: unknown) => unknown;

/**
 * Express' `req.params` and `req.query` objects are immutable by default, however we need to be
 * able to modify them to transform values into their expected types.
 */
function makeMutable(this: "params" | "query", req: Request): void {
    Object.defineProperty(req, this, { writable: true, value: { ...req[this] } });
}

function identity<T>(x: T): T {
    return x;
}

/** Transformer for an array of parameters. */
function arrayTransform(this: TransformFn, x: unknown): unknown {
    if (Array.isArray(x)) {
        return x.map(this);
    }

    // Express' default paramater parsers don't identify single items as arrays
    if (typeof x === "string") {
        return [this(x)];
    }

    return x;
}

/** Returns the correct transformation function for a parameter schema. */
function makeTransformer(schema: OAS.Schema | OAS.Reference): TransformFn {
    if ("$ref" in schema) {
        throw new Error(`Cannot transform a $ref`);
    }

    switch (schema.type) {
        case "string":
            return identity;

        case "integer":
        case "number":
            return Number;

        case "boolean":
            return Boolean;

        case "array":
            if (schema.items === undefined) {
                throw new Error(`Missing schema.items`);
            }

            return arrayTransform.bind(makeTransformer(schema.items));

        case "object":
        case undefined:
        default:
            throw new Error(`Cannot transform schema of type ${schema.type}`);
    }
}

interface DoObjectAssignThis {
    type: "params" | "query";

    key: string;

    transform: (input: unknown) => void;
}

function doObjectAssign(this: DoObjectAssignThis, req: Request): void {
    const { type, key, transform } = this;

    Object.assign(req[type], { [key]: transform(req[type][key]) });
}

/** Creates functions for transforming path/query parameters into a desired schema type. */
export function makeParameterTransformers(
    spec: SpecObject,
    type: "params" | "query",
): ((req: Request) => void)[] {
    if (!spec.schema.properties) {
        return [];
    }

    const output: ((req: Request) => void)[] = [makeMutable.bind(type)];

    for (const [key, value] of Object.entries(spec.schema.properties)) {
        try {
            const transform = makeTransformer(value);

            output.push(doObjectAssign.bind({ type, key, transform }));
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(
                    `Failed to make transformer for ${type === "params" ? "path" : "query"} parameter ${colorize(key, Color.FgRed)}: ${error.message}`,
                    { cause: error },
                );
            }

            throw error;
        }
    }

    return output;
}
