import type { OAS } from "@/shared/global/OAS";
import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { readFileSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";

export function generateRootDescription(): string {
    return readFileSync("README.md", "utf-8")
        .trim()
        .replaceAll("docs/", "https://github.com/Pantheon-Community/PantheonAPI/blob/main/docs/")
        .replaceAll("static/", "./");
}

const rootDir = join(import.meta.dirname, "..", "..");

const routesDir = join(rootDir, "routes");

export function generateEndpointDescription(
    endpoint: AnyEndpoint,
): Pick<OAS.Operation, "description" | "tags"> {
    const { description: initialDescription, source, tag: overrideTag } = endpoint;

    const description = `${initialDescription}\n\n[${basename(source)}](https://github.com/Pantheon-Community/PantheonAPI/blob/main/src/${relative(rootDir, source).replaceAll(sep, "/")})`;

    const tag = overrideTag ?? relative(routesDir, source).split(sep).at(0);

    if (!tag) {
        return { description };
    }

    return { description, tags: [tag] };
}
