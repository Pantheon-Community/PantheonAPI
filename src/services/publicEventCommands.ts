/**
 * Canonical catalog keys accepted for purchased events.
 *
 * These keys must stay in sync with `EventCatalog` in PantheonEvents. `hle` is
 * the catalog key for Homelander (its RA command name is `homelander`); the
 * plugin resolves by command *type*, never by sending a raw console string.
 */
export const PUBLIC_EVENT_COMMANDS = [
    "birdistheword",
    "dodgeball",
    "facilitywarfare",
    "hangthedj",
    "hideandseek",
    "hle",
    "knifefight",
    "labyrinth",
    "lasertag",
    "leapfrog",
    "micromanagement",
    "modhunt",
    "murderinthedark",
    "musicalchairs",
    "nukerun",
    "nutallergy",
    "peanutdodgeball",
    "redlightgreenlight",
    "scp079escape",
    "scpreplication",
    "searchanddestroy",
    "traitor",
    "zombiesurvival",
    "excorpses",
    "ff",
    "hsonly",
    "lifesteal",
    "gravity",
    "tiny",
    "fog",
    "faultyfacility",
] as const;
export const UNSUPPORTED_EVENT_COMMANDS = [
    "cockfights",
    "gungame",
    "spleef",
    "tag",
    "walkingdead",
] as const;

export type PublicEventCommand = (typeof PUBLIC_EVENT_COMMANDS)[number];

/**
 * Only these events accept a song-selection argument. Out-of-range values are
 * rejected by the event command itself (which returns false without starting),
 * so the plugin reports them as definitely-not-executed rather than uncertain.
 */
const SONG_EVENTS: Record<string, number> = { hangthedj: 11, musicalchairs: 11 };

const COMMAND_SET: ReadonlySet<string> = new Set<string>(PUBLIC_EVENT_COMMANDS);
const MODIFIER_COMMANDS: ReadonlySet<string> = new Set([
    "excorpses",
    "ff",
    "hsonly",
    "lifesteal",
    "gravity",
    "tiny",
    "fog",
    "faultyfacility",
]);

/** Category is editable presentation metadata, never purchase authorization. */
export function eventRequiresDonor(command: string): boolean {
    if (!isSupportedEventCommand(command)) return true;
    return !MODIFIER_COMMANDS.has(validateEventCommand(command).split(" ")[0]!);
}

export function eventComingSoon(command: string): boolean {
    return (
        isSupportedEventCommand(command) &&
        ["redlightgreenlight", "murderinthedark"].includes(
            validateEventCommand(command).split(" ")[0]!,
        )
    );
}

export function isPublicEventCommand(command: string): command is PublicEventCommand {
    return COMMAND_SET.has(command);
}

/** Commands an administrator may configure, for staff-facing responses. */
export function listPublicEventCommands(): string[] {
    return [...PUBLIC_EVENT_COMMANDS, ...UNSUPPORTED_EVENT_COMMANDS];
}

export function isSupportedEventCommand(command: string): boolean {
    try {
        validateEventCommand(command);
        return true;
    } catch {
        return false;
    }
}

/** Known placeholders may be maintained by staff, but never enabled. */
export function validateCatalogCommand(command: string, enabled: boolean): string {
    if (typeof command === "string") {
        const normalized = command.trim().replace(/^\/+/, "").toLowerCase();
        if (UNSUPPORTED_EVENT_COMMANDS.some((key) => key === normalized)) {
            if (enabled) throw new Error("Unsupported catalog commands cannot be enabled");
            return normalized;
        }
    }
    return validateEventCommand(command);
}

/**
 * Validates and normalises a staff-supplied event command.
 *
 * Accepts an optional leading slash and mixed case. At most one positive
 * integer argument is allowed, and only for song-selecting events. Rejects
 * `stop`, `list`, chained commands, and anything outside the allowlist.
 */
export function validateEventCommand(command: string): string {
    if (typeof command !== "string") throw new Error("Invalid event command");

    const trimmed = command.trim().replace(/^\/+/, "").toLowerCase();

    if (trimmed.length === 0 || trimmed.length > 40) {
        throw new Error("Invalid event command length");
    }

    // Tight allowlist: the event key and an optional integer argument, nothing
    // else. This also rejects control characters, separators, and chaining.
    if (!/^[a-z0-9]+(?: [1-9][0-9]*)?$/.test(trimmed)) {
        throw new Error("Invalid event command characters");
    }

    const parts = trimmed.split(" ");

    if (parts.length > 2) throw new Error("Event command may only contain one argument");

    const [name = "", argument] = parts;

    if (!isPublicEventCommand(name)) {
        throw new Error("Command is not an allowlisted event start");
    }

    if (argument === undefined) return name;

    const max = SONG_EVENTS[name];

    if (max === undefined) {
        throw new Error(`The ${name} event does not accept an argument`);
    }

    if (!/^[1-9][0-9]*$/.test(argument)) {
        throw new Error("Song selection must be a positive integer");
    }

    const song = Number(argument);

    if (!Number.isSafeInteger(song) || song < 1 || song > max) {
        throw new Error(`Song selection must be between 1 and ${max}`);
    }

    return `${name} ${song}`;
}

/** Splits a stored command back into the catalog key and optional arguments. */
export function splitEventCommand(command: string): { name: string; arguments: string[] } {
    const parts = command
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((x) => x.length > 0);

    return { name: parts[0] ?? "", arguments: parts.slice(1) };
}
