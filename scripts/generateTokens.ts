/* Generates a secure random token for use in config. */

import { randomBytes } from "node:crypto";

const tokens = new Array(5).fill(null).map(() => randomBytes(16).toString("hex"));

console.log(tokens.join("\n"));
