/** biome-ignore-all lint/style/useNamingConvention: HTTP Header Convention */

import { discordUserAgent } from "./discordUserAgent";

/**
 * Contructs headers for Discord OAuth endpoints.
 *
 * {@link https://docs.discord.com/developers/reference#http-api Discord Reference}
 */
export function makeAuthRequestHeaders(): Record<string, string> {
	return {
		"Content-Type": "application/x-www-form-urlencoded",
		Accept: "application/json",
		"User-Agent": discordUserAgent,
	};
}
