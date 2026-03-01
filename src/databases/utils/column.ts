/**
 * Common column data types.
 *
 * If changing these, be sure to write migration scripts for all affected tables.
 */
export enum Column {
	Token = "VARCHAR(64)",

	Snowflake = "VARCHAR(20)",

	SteamId64 = "VARCHAR(32)",

	Ip = "VARCHAR(64)",

	UserAgent = "VARCHAR(255)",
}
