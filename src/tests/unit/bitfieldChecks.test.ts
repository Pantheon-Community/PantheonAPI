import { EconomyPermissions } from "@/shared/types/Permissions/EconomyPermissions";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { test } from "bun:test";

function checkBitfield(obj: object, name: string): void {
    const entries = Object.entries(obj).filter(
        (x): x is [string, number] => typeof x[1] === "number",
    );

    if (entries.length === 0) {
        throw new Error(`The ${name} bitfield is empty`);
    }

    if (entries[0][1] !== 0) {
        throw new Error(
            `Expected first value "${entries[0][0]}" of the ${name} bitfield to be 0 (got ${entries[0][1]})`,
        );
    }

    for (let i = 1; i < entries.length; i++) {
        const [key, actual] = entries[i];

        const expected = 1 << (i - 1);

        if (expected !== actual) {
            throw new Error(
                `Expected value "${key}" (order ${i + 1}) of the ${name} bitfield to be ${expected} (got ${actual})`,
            );
        }
    }
}

test("Permissions", () => {
    checkBitfield(EconomyPermissions, "EconomyPermissions");
    checkBitfield(GeneralPermissions, "GeneralPermissions");
});
