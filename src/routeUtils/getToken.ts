import { UnauthorizedError } from "@/errors/UnauthorizedError";
import type { UserToken } from "@/shared/types/Common";
import type { PluginToken } from "@/shared/types/PluginToken";
import type { AnyRequest } from "@/types/Express/AnyRequest";

/** Gets the value of the 'Authorization' header of a request, if it exists. */
export function getToken<T extends UserToken | PluginToken>(req: AnyRequest): T | null {
    let value = req.get("authorization");

    if (value === undefined) {
        return null;
    }

    value = value.trim();

    if (value.toLowerCase().startsWith("bearer")) {
        value = value.slice(6).trim();
    }

    return value as T;
}

/**
 * Gets the value of the 'Authorization' header of a request.
 *
 * Throws an {@link UnauthorizedError} if it does not exist.
 */
export function getTokenRequired<T extends UserToken | PluginToken>(req: AnyRequest): T {
    const token = getToken<T>(req);

    if (token === null) {
        throw new UnauthorizedError({
            title: "Missing Token",
            description: 'A token was not provided in the "Authorization" header.',
        });
    }

    return token;
}
