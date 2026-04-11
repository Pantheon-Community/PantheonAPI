import { readFileSync } from "node:fs";

export function generateDescription(): string {
    return readFileSync("README.md", "utf-8")
        .trim()
        .replaceAll("docs/", "https://github.com/Pantheon-Community/PantheonAPI/blob/main/docs/")
        .replaceAll("static/", "./");
}
