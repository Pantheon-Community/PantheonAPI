import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { UserPermissions } from "@/shared/types/Permissions/UserPermissions";
import { test } from "bun:test";

function checkBitfield(obj: object, name: string): void {
    const entries = Object.entries(obj).filter(
        (x): x is [string, number] => typeof x[1] === "number",
    );

    const firstEntry = entries[0];

    if (firstEntry === undefined) {
        throw new Error(`The ${name} bitfield is empty`);
    }

    if (firstEntry[1] !== 0) {
        throw new Error(
            `Expected first value "${firstEntry[0]}" of the ${name} bitfield to be 0 (got ${firstEntry[1]})`,
        );
    }

    for (let i = 1; i < entries.length; i++) {
        const [key, actual] = entries[i]!;

        const expected = 1 << (i - 1);

        if (expected !== actual) {
            throw new Error(
                `Expected value "${key}" (order ${i + 1}) of the ${name} bitfield to be ${expected} (got ${actual})`,
            );
        }
    }
}

test("Permissions", () => {
    checkBitfield(GeneralPermissions, "GeneralPermissions");
    checkBitfield(UserPermissions, "UserPermissions");
});
