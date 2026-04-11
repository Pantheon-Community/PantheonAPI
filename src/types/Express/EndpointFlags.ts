export enum EndpointFlags {
    None = 0,

    /**
     * This endpoint does not return any content.
     *
     * Effect: Changes HTTP status code from 200 (OK) to 204 (No Content).
     */
    NoContent = 1 << 0,

    /**
     * This endpoint makes requests to other APIs, like Steam or Discord.
     *
     * Effect: Documents secondary request errors as a possible response.
     */
    MakesSecondaryRequests = 1 << 1,

    /** Self-explanatory. */
    May403 = 1 << 2,

    /** Self-explanatory. */
    May404 = 1 << 3,
}
