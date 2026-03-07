/** Defines the level of authorization and authentication needed for an endpoint. */
export enum AuthScope {
    /** No `Authorization` header needed. */
    None,

    /**
     * An `Authorization` header is needed, but the user associated with the token doesn't ever
     * need to be fetched.
     *
     * - Will throw an `UnauthorizedError` if the token is missing or invalid.
     */
    TokenOnly,

    /**
     * An `Authorization` header isn't needed, but if supplied then the associated user will be
     * fetched.
     *
     * - Will throw an `UnauthorizedError` if the token is invalid.
     */
    OptionalUser,

    /**
     * An `Authorization` header is needed.
     *
     * - Will throw an `UnauthorizedError` if the token or its associated user is missing or
     * invalid.
     */
    User,

    /**
     * An `Authorization` header is needed, but user tokens are not accepted.
     *
     * This is used for plugin authentication.
     *
     * - Will throw an `UnauthorizedError` if the token is missing or invalid.
     * - Will throw a `ForbiddenError` if the token is unrecognised (e.g. a user token was used
     * instead of a plugin token).
     */
    Plugin,
}
