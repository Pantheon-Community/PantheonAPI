/* Copies the contents of README.md into the description of openapi.json. */

import { readFileSync, writeFileSync } from "node:fs";

const contents = readFileSync("README.md", "utf-8")
    .trim()
    .replaceAll("docs/", "https://github.com/Pantheon-Community/PantheonAPI/blob/main/docs/")
    .replaceAll("static/", "./");

const spec = JSON.parse(readFileSync("openapi.json", "utf-8"));

spec.info.description = contents;

writeFileSync("openapi.json", JSON.stringify(spec, undefined, 4));
