/* Checks that the contents of README.md matches the API spec description of openapi.json */

import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { readFileSync } from "node:fs";
import process from "node:process";

const inReadme = readFileSync("README.md", "utf-8")
    .trim()
    .replaceAll("docs/", "https://github.com/Pantheon-Community/PantheonAPI/blob/main/docs/")
    .replaceAll("static/", "./");

const inSpec = JSON.parse(readFileSync("openapi.json", "utf8")).info.description;

if (inReadme === inSpec) {
    console.log(colorize(`README matches spec`, Color.FgGreen));
} else {
    console.log(colorize(`README does not match spec`, Color.FgRed));
    process.exit(1);
}
