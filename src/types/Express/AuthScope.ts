/** Defines the level of authorisation and authentication needed for an endpoint. */
export enum AuthScope {
    /** No `Authorization` header needed. */
    None,

    /**
     * A valid `Authorization` header is needed.
     *
     * This is used by endpoints that use session data, like Discord access tokens or user IDs.
     */
    Session,

    /**
     * A valid `Authorization` header is needed, and the user may also needs certain permissions.
     *
     * This is used by endpoints that use session data and also conduct elevated actions, like
     * modifying other users or roles.
     */
    Permission,

    /**
     * A valid `Authorization` header is needed, but the value is a plugin token, not a user token.
     *
     * This is used by endpoints that are exclusively called by our SCP:SL plugins or similar
     * first-party services.
     */
    Plugin,
}
