import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { logWithTimeTaken } from "@/utils/logging";
import { Dirent, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const startTime = Date.now();

const folders = {
    shared: ["constants", "global", "spec", "types", "utils"],
    root: ["scripts", "src", "static"],
};

const files: Dirent[] = [];

for (const sharedFolder of folders.shared) {
    const path = join(import.meta.dirname, "..", "shared", sharedFolder);

    files.push(...readdirSync(path, { recursive: true, withFileTypes: true }));
}

for (const folder of folders.root) {
    const path = join(import.meta.dirname, "..", folder);

    files.push(...readdirSync(path, { recursive: true, withFileTypes: true }));
}

let fileCount = 0;
let lineCount = 0;

for (const file of files.filter(
    (x) => x.name.endsWith(".ts") || x.name.endsWith(".js") || x.name.endsWith(".html"),
)) {
    fileCount++;

    const path = join(file.parentPath, file.name);

    lineCount += readFileSync(path, { encoding: "utf-8" }).split("\n").length;
}

logWithTimeTaken(
    `${colorize(lineCount.toLocaleString(), Color.FgMagenta)} Lines of code across ${colorize(fileCount.toLocaleString(), Color.FgMagenta)} files`,
    startTime,
);
