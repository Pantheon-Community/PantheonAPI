import { describe, expect, test } from "bun:test";
import {
    PUBLIC_EVENT_COMMANDS,
    isPublicEventCommand,
    splitEventCommand,
    validateEventCommand,
    validateCatalogCommand,
    isSupportedEventCommand,
    listPublicEventCommands,
    UNSUPPORTED_EVENT_COMMANDS,
} from "@/services/publicEventCommands";
import { PUBLIC_EVENT_DESCRIPTIONS } from "@/services/publicEventDescriptions";
import { PUBLIC_EVENT_PRICE_SHEET } from "@/services/publicEventSeed";
import {
    EVENT_CATALOG,
    EVENT_ADMIN_CATALOG,
    EVENT_CATALOG_PAYLOAD,
} from "@/shared/types/PublicEvents";

test("catalog schemas require category and expose support only to staff", () => {
    const row = {
        id: 1,
        name: "Tiny",
        description: "",
        image: null,
        cost: 1500,
        category: "modifier",
        requiresDonor: false,
        requiresStaff: false,
        comingSoon: false,
    };
    expect(() => EVENT_CATALOG.validate(row)).not.toThrow();
    expect(() => EVENT_CATALOG.validate({ ...row, category: "invalid" })).toThrow();
    expect(() => EVENT_CATALOG.validate({ ...row, category: undefined })).toThrow();
    expect(() => EVENT_CATALOG.validate({ ...row, supported: true })).toThrow();
    const {
        id: _id,
        requiresDonor: _requiresDonor,
        requiresStaff: _requiresStaff,
        comingSoon: _comingSoon,
        ...payload
    } = row;
    const staff = { ...payload, command: "tiny", enabled: true };
    expect(() => EVENT_CATALOG_PAYLOAD.validate(staff)).not.toThrow();
    expect(() => EVENT_CATALOG_PAYLOAD.validate({ ...staff, supported: true })).toThrow();
    expect(() => EVENT_CATALOG_PAYLOAD.validate({ ...staff, requiresDonor: false })).toThrow();
    expect(() =>
        EVENT_ADMIN_CATALOG.validate({
            ...staff,
            id: 1,
            requiresDonor: false,
            requiresStaff: false,
            comingSoon: false,
            supported: true,
        }),
    ).not.toThrow();
    expect(() => EVENT_ADMIN_CATALOG.validate({ ...staff, id: 1 })).toThrow();
});

describe("public event command allowlist", () => {
    test("contains no aliases, only canonical catalog keys", () => {
        expect(PUBLIC_EVENT_COMMANDS).toHaveLength(29);
        expect(new Set(PUBLIC_EVENT_COMMANDS).size).toBe(PUBLIC_EVENT_COMMANDS.length);
        expect(PUBLIC_EVENT_COMMANDS).not.toContain("stop");
        expect(PUBLIC_EVENT_COMMANDS).not.toContain("list");
        expect(PUBLIC_EVENT_COMMANDS).not.toContain("homelander");
    });

    test("accepts every allowlisted command bare", () => {
        for (const command of PUBLIC_EVENT_COMMANDS) {
            expect(validateEventCommand(command)).toBe(command);
            expect(validateEventCommand(`/${command.toUpperCase()}`)).toBe(command);
        }
    });

    test("modifiers accept no arguments and placeholders cannot execute or enable", () => {
        for (const command of [
            "excorpses",
            "ff",
            "hsonly",
            "lifesteal",
            "gravity",
            "tiny",
        ]) {
            expect(validateEventCommand(command)).toBe(command);
            expect(() => validateEventCommand(`${command} 1`)).toThrow();
        }
        for (const command of UNSUPPORTED_EVENT_COMMANDS) {
            expect(isSupportedEventCommand(command)).toBe(false);
            expect(() => validateEventCommand(command)).toThrow();
            expect(validateCatalogCommand(`/${command.toUpperCase()}`, false)).toBe(command);
            expect(() => validateCatalogCommand(command, true)).toThrow();
            expect(() => validateCatalogCommand(`${command} 1`, false)).toThrow();
        }
        expect(() => validateCatalogCommand("unknown", false)).toThrow();
    });

    test("accepts song selections only for hangthedj and musicalchairs", () => {
        expect(validateEventCommand("hangthedj 1")).toBe("hangthedj 1");
        expect(validateEventCommand("musicalchairs 11")).toBe("musicalchairs 11");
        expect(() => validateEventCommand("hangthedj 12")).toThrow();
        expect(() => validateEventCommand("musicalchairs 0")).toThrow();
        expect(() => validateEventCommand("traitor 1")).toThrow();
    });

    test("removed Everything Explodes cannot execute or be configured", () => {
        expect(listPublicEventCommands()).not.toContain("everythingexplodes");
        expect(PUBLIC_EVENT_DESCRIPTIONS).not.toHaveProperty("everythingexplodes");
        expect(
            PUBLIC_EVENT_PRICE_SHEET.some(([command]) => command === "everythingexplodes"),
        ).toBe(false);
        for (const command of [
            "everythingexplodes",
            " /EVERYTHINGEXPLODES ",
            "everythingexplodes 1",
        ]) {
            expect(isSupportedEventCommand(command)).toBe(false);
            expect(() => validateEventCommand(command)).toThrow();
            expect(() => validateCatalogCommand(command, true)).toThrow();
            expect(() => validateCatalogCommand(command, false)).toThrow();
        }
    });

    test("rejects out of range, non-integer, and non-positive song values", () => {
        expect(() => validateEventCommand("musicalchairs 12")).toThrow();
        expect(() => validateEventCommand("musicalchairs 1a")).toThrow();
        expect(() => validateEventCommand("musicalchairs -1")).toThrow();
        expect(() => validateEventCommand("musicalchairs 01")).toThrow();
        expect(() => validateEventCommand("musicalchairs 0")).toThrow();
    });

    test("rejects aliases and unknown commands", () => {
        for (const alias of [
            "has",
            "mitd",
            "zs",
            "labr",
            "scprep",
            "mh",
            "rlgl",
            "sad",
            "079escape",
            "mc",
            "traitorevent",
        ]) {
            expect(() => validateEventCommand(alias)).toThrow();
        }
    });

    test("rejects chaining, stop, list, and empty commands", () => {
        expect(() => validateEventCommand("labyrinth stop")).toThrow();
        expect(() => validateEventCommand("hangthedj list")).toThrow();
        expect(() => validateEventCommand("stop")).toThrow();
        expect(() => validateEventCommand("labyrinth;traitor")).toThrow();
        expect(() => validateEventCommand("labyrinth traitor")).toThrow();
        expect(() => validateEventCommand("")).toThrow();
        expect(() => validateEventCommand("   ")).toThrow();
    });

    test("rejects embedded control characters and oversized input, but trims padding", () => {
        // Surrounding whitespace is normalised, so a trailing newline is fine.
        expect(validateEventCommand("labyrinth\n")).toBe("labyrinth");
        expect(validateEventCommand("  Labyrinth  ")).toBe("labyrinth");
        // A tab between the key and an argument is not a space separator.
        expect(() => validateEventCommand("labyrinth\t1")).toThrow();
        expect(() => validateEventCommand("labyrinth\ntraitor")).toThrow();
        expect(() => validateEventCommand("a".repeat(41))).toThrow();
    });

    test("isPublicEventCommand matches the allowlist", () => {
        expect(isPublicEventCommand("traitor")).toBe(true);
        expect(isPublicEventCommand("homelander")).toBe(false);
        expect(isPublicEventCommand("hle")).toBe(true);
    });

    test("splitEventCommand separates key from arguments", () => {
        expect(splitEventCommand("hangthedj 7")).toEqual({ name: "hangthedj", arguments: ["7"] });
        expect(splitEventCommand("traitor")).toEqual({ name: "traitor", arguments: [] });
        expect(splitEventCommand("")).toEqual({ name: "", arguments: [] });
    });
});
