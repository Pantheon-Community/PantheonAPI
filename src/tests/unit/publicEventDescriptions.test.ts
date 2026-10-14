import { expect, test } from "bun:test";
import { PUBLIC_EVENT_DESCRIPTIONS } from "@/services/publicEventDescriptions";
import { PUBLIC_EVENT_COMMANDS, UNSUPPORTED_EVENT_COMMANDS } from "@/services/publicEventCommands";

test("default catalog has player-facing copy for every command and honest unavailable placeholders", () => {
    for (const command of [...PUBLIC_EVENT_COMMANDS, ...UNSUPPORTED_EVENT_COMMANDS]) {
        const description = PUBLIC_EVENT_DESCRIPTIONS[command];
        expect(typeof description).toBe("string");
        expect(description!.length).toBeGreaterThan(10);
        expect(description).not.toMatch(/demo|fixture|synthetic/i);
    }
    for (const command of UNSUPPORTED_EVENT_COMMANDS) {
        expect(PUBLIC_EVENT_DESCRIPTIONS[command]).toBe("Not currently available for purchase.");
    }
    expect(PUBLIC_EVENT_DESCRIPTIONS["excorpses"]).toContain("visual");
});
