/** biome-ignore-all lint/style/useNamingConvention: HTTP Header Convention */

import type { UserToken } from "@/shared/types/Common";
import { discordUserAgent } from "./discordUserAgent";

/**
 * Contructs headers for elevated Discord endpoints.
 *
 * {@link https://docs.discord.com/developers/reference#http-api Discord Reference}
 */
export function makeElevatedRequestHeaders(token: UserToken): Record<string, string> {
	return {
		Authorization: `Bearer ${token}`,
		Accept: "application/json",
		"User-Agent": discordUserAgent,
	};
}
