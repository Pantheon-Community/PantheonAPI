/* Checks for misconfigured links in the OpenAPI spec. */

import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

type JsonValue = string | number | boolean | null | { [x: string]: JsonValue } | JsonValue[];

const operationRegexp = /\(|\)/;

const pathToCheck = "/Pantheon-Community/PantheonAPI-Types/blob/";

const stats = {
    skipped: 0,
    invalid: 0,
    external: 0,
    notMain: 0,
    mismatchedDescription: 0,
    dead: 0,
    ok: 0,
};

/** Validates the the file pointed to by an internally-linking URL actually exists. */
function checkUrl(url: string, description?: string): void {
    // Don't try parse URls with variables, e.g. http://localhost:{port}
    if (url.includes("{")) {
        stats.skipped += 1;
        return;
    }

    if (!URL.canParse(url)) {
        stats.invalid += 1;
        console.log(`Invalid URL: ${colorize(url, Color.FgRed)}`);
        return;
    }

    const parsedUrl = new URL(url);

    // Don't bother validating URLs that link to external sites.
    if (!parsedUrl.pathname.startsWith(pathToCheck)) {
        stats.external += 1;
        return;
    }

    let relativePath = parsedUrl.pathname.slice(pathToCheck.length);

    if (!relativePath.startsWith("main/")) {
        stats.notMain += 1;
        console.log(`URL doesn't point to the main branch: ${colorize(url, Color.FgRed)}`);
        return;
    }

    relativePath = relativePath.slice("main/".length);

    if (description !== undefined && relativePath !== description) {
        stats.mismatchedDescription += 1;
        console.log(
            `URL description doesn't match file path:\n\t${colorize(url, Color.FgRed)}\n\t${" ".repeat(url.length - relativePath.length)}${colorize(description, Color.FgCyan)}`,
        );
        return;
    }

    if (!existsSync(resolve("shared", relativePath))) {
        stats.dead += 1;
        console.log(
            `URL points to a non-existent file:\n\t${colorize(url, Color.FgRed)}\n\t${colorize(relativePath, Color.FgCyan)}`,
        );
        return;
    }

    stats.ok += 1;
}

function recursivelyCheckKeys(obj: JsonValue): void {
    if (typeof obj !== "object" || obj === null) return;

    if (Array.isArray(obj)) {
        obj.forEach(recursivelyCheckKeys);
        return;
    }

    const { url, description, operationId } = obj;

    if (typeof url === "string" && (typeof description === "string" || description === undefined)) {
        checkUrl(url, description);
    }

    if (typeof description === "string" && typeof operationId === "string") {
        for (const maybeUrl of description.split(operationRegexp)) {
            try {
                const parsedUrl = new URL(maybeUrl);
                if (!parsedUrl.pathname.startsWith(pathToCheck)) continue;

                checkUrl(maybeUrl);

                if (!maybeUrl.includes(operationId)) {
                    stats.mismatchedDescription += 1;
                    console.log(
                        `URL description doesn't match operationId:\n\t${colorize(maybeUrl, Color.FgRed)}\n\t${colorize(operationId, Color.FgCyan)}`,
                    );
                }
            } catch {
                //
            }
        }
    }

    for (const key of Object.keys(obj)) {
        const child = obj[key];
        if (child !== undefined) {
            recursivelyCheckKeys(child);
        }
    }
}

recursivelyCheckKeys(JSON.parse(readFileSync("openapi.json", "utf-8")));

const totalChecked = Object.values(stats).reduce((a, b) => a + b, 0);

function countOf(key: keyof typeof stats): string {
    return colorize(stats[key].toString().padEnd(2, " "), stats[key] ? Color.FgRed : Color.FgGreen);
}

console.log(
    `\nChecked ${colorize(totalChecked.toString(), Color.Bright)} URLs:\n${[
        `${stats.skipped.toString().padEnd(2, " ")} Skipped`,
        `${stats.external.toString().padEnd(2, " ")} External`,
        `${countOf("invalid")} Invalid`,
        `${countOf("notMain")} Not Main Branch`,
        `${countOf("mismatchedDescription")} Mismatched Description`,
        `${countOf("dead")} Dead Link`,
        `${colorize(stats.ok.toString().padEnd(2, " "), Color.FgGreen)} OK`,
    ].join("\n")}`,
);

if (stats.invalid + stats.notMain + stats.mismatchedDescription + stats.dead > 0) {
    process.exit(1);
}
