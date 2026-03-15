/** Defines the level of authorization and authentication needed for an endpoint. */
export enum AuthScope {
    /** No `Authorization` header needed. */
    None,

    /**
     * A valid `Authorization` header is needed.
     *
     * This is used by endpoints that use session data, like Discord access tokens or user IDs.
     *
     * - Will throw an `UnauthorizedError` if the token is missing or invalid.
     */
    Session,

    /**
     * A valid `Authorization` header is needed, and the user also needs certain permissions.
     *
     * This is used by endpoints that use session data and also conduct elevated actions, like
     * modifying other users or roles.
     *
     * - Will throw an `UnauthorizedError` if the token is missing or invalid.
     * - Will throw a `MissingPermissionError` if the user lacks permission.
     */
    Permission,
}
