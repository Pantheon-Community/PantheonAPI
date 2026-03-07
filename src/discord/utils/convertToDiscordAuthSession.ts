import type { UserToken } from "@/shared/types/Common";
import type { DiscordAuthData } from "@/types/Discord";
import type { RESTPostOAuth2AccessTokenResult } from "discord-api-types/v10";

export function convertToDiscordAuthSession(
    data: RESTPostOAuth2AccessTokenResult,
): DiscordAuthData {
    const { access_token, refresh_token, expires_in } = data;
    return {
        accessToken: access_token as UserToken,
        refreshToken: refresh_token as UserToken,
        expiresAt: new Date(Date.now() + expires_in * 1000),
    };
}
