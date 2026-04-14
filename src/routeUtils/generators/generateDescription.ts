import { GeneralPermissionInfo } from "@/shared/constants/permissions/GeneralPermissionsInfo";
import { UserPermissionsInfo } from "@/shared/constants/permissions/UserPermissionsInfo";
import type { OAS } from "@/shared/global/OAS";
import { split } from "@/shared/utils/bitfieldHelpers";
import { AuthScope } from "@/types/Express/AuthScope";
import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { readFileSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";

export function generateRootDescription(): string {
    return readFileSync("README.md", "utf-8")
        .trim()
        .replaceAll("docs/", "https://github.com/Pantheon-Community/PantheonAPI/blob/main/docs/")
        .replaceAll(
            ".github/",
            "https://github.com/Pantheon-Community/PantheonAPI/blob/main/.github/",
        )
        .replaceAll("static/", "./");
}

const rootDir = join(import.meta.dirname, "..", "..");

const routesDir = join(rootDir, "routes");

export function generateEndpointDescription(
    endpoint: AnyEndpoint,
): Pick<OAS.Operation, "description" | "tags"> {
    const { description: initialDescription, source, tag: overrideTag } = endpoint;

    const descriptionParts: string[] = [
        initialDescription,
        getAuthDescription(endpoint),
        `[${basename(source)}](https://github.com/Pantheon-Community/PantheonAPI/blob/main/src/${relative(rootDir, source).replaceAll(sep, "/")})`,
    ];

    const description = descriptionParts.join("\n\n");

    const tag = overrideTag ?? relative(routesDir, source).split(sep).at(0);

    if (!tag) {
        return { description };
    }

    return { description, tags: [tag] };
}

function getAuthDescription(endpoint: AnyEndpoint): string {
    const { auth } = endpoint;

    const title = `Authorisation Level: **${AuthScope[auth]}**`;

    const description = AUTH_SCOPE_DESCRIPTIONS[auth];

    if (auth !== AuthScope.Permission) {
        return `${title} - ${description}`;
    }

    const subDescriptions: string[] = [];

    const { permissions } = endpoint;

    const { generalPermissions, userPermissions } = permissions;

    if (generalPermissions) {
        const perms = split(generalPermissions);

        subDescriptions.push(
            `- General Permissions (${perms.length}): ${perms.map((x) => `\`${GeneralPermissionInfo[x].name}\``).join(", ")}`,
        );
    }

    if (userPermissions) {
        const perms = split(userPermissions);

        subDescriptions.push(
            `- User Permissions (${perms.length}): ${perms.map((x) => `\`${UserPermissionsInfo[x].name}\``).join(", ")}`,
        );
    }

    return `${title} - ${description}\n${subDescriptions.join("\n")}`;
}

const AUTH_SCOPE_DESCRIPTIONS: Record<AuthScope, string> = {
    [AuthScope.None]: "Anyone can call this endpoint.",
    [AuthScope.Session]: "Only logged-in users can call this endpoint.",
    [AuthScope.Permission]: "Only logged-in users with certain permissions can call this endpoint.",
    [AuthScope.Plugin]:
        "Only our SCP:SL plugins and other first-party services can call this endpoint.",
};
