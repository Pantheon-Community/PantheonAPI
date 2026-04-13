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
    const { description, source } = endpoint;

    const finalDescription = `${description}\n\n[${basename(source)}](https://github.com/Pantheon-Community/PantheonAPI/blob/main/src/${relative(rootDir, source).replaceAll(sep, "/")})`;

    const tag = relative(routesDir, source).split(sep).at(0);

    if (!tag) {
        return {
            description: finalDescription,
        };
    }

    return {
        description: finalDescription,
        tags: [tag],
    };
}
