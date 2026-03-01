import type { RESTPostOAuth2AccessTokenResult } from "discord-api-types/v10";
import type { UserToken } from "@/shared/types/Common";
import type { DiscordAuthData } from "@/types/Discord";

export function convertToDiscordAuthSession(
	data: RESTPostOAuth2AccessTokenResult,
): DiscordAuthData {
	return {
		accessToken: data.access_token as UserToken,
		refreshToken: data.refresh_token as UserToken,
		expiresAt: new Date(Date.now() + data.expires_in * 1000),
	};
}
