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
}
