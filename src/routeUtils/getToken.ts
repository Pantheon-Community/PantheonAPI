import { UnauthorizedError } from "@/errors/UnauthorizedError";
import type { UserToken } from "@/shared/types/Common";
import type { AnyRequest } from "@/types/Express/AnyRequest";

/** Gets the value of the 'Authorization' header of a request, if it exists. */
export function getToken(req: AnyRequest): UserToken | null {
    let value = req.get("authorization");

    if (value === undefined) {
        return null;
    }

    value = value.trim();

    if (value.toLowerCase().startsWith("bearer")) {
        value = value.slice(6).trim();
    }

    return value as UserToken;
}

/**
 * Gets the value of the 'Authorization' header of a request.
 *
 * Throws an {@link UnauthorizedError} if it does not exist.
 */
export function getTokenRequired(req: AnyRequest): UserToken {
    const token = getToken(req);

    if (token === null) {
        throw new UnauthorizedError({
            title: "Missing Token",
            description: 'A token was not provided in the "Authorization" header.',
        });
    }

    return token;
}
