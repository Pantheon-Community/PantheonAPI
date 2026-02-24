/** Defines the level of authorization and authentication needed for an endpoint. */
export enum AuthScope {
	/** No `Authorization` header needed. */
	None,

	/**
	 * An `Authorization` header is needed, but the user associated with the token doesn't ever
	 * need to be fetched.
	 *
	 * - Will throw a `BadAuthError` if the token is missing or invalid.
	 */
	TokenOnly,

	/**
	 * An `Authorization` header isn't needed, but if supplied then the associated user will be
	 * fetched.
	 *
	 * - Will throw a `BadAuthError` if the token is invalid.
	 * - Will throw a `NotFoundError` if the user no longer exists in the database.
	 */
	OptionalUser,

	/**
	 * An `Authorization` header is needed.
	 *
	 * - Will throw a `BadAuthError` if the token is missing or invalid.
	 * - Will throw a `NotFoundError` if the user no longer exists in the database.
	 * - Will throw a `ForbiddenError` if the user lacks **any** of the required permissions (if
	 * permissions are also specified).
	 */
	User,

	/**
	 * An `Authorization` header is needed, but user tokens are not accepted.
	 *
	 * This is used for custom token verification for plugins.
	 *
	 * - Will throw a `BadAuthError` if the token is missing or invalid.
	 * - Will throw a `ForbiddenError` if the token is unrecognised (e.g. a site token was used
	 * instead of a plugin token).
	 */
	Plugin,
}
