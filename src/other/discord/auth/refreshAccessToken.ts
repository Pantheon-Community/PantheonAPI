import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import type { UserToken } from "@/shared/types/Common";
import type { DiscordAuthData } from "@/types/Discord";
import type { ServerTimer } from "@/utils/serverTimer";
import { OAuth2Routes, type RESTPostOAuth2AccessTokenResult } from "discord-api-types/v10";
import { convertToDiscordAuthSession } from "../utils/convertToDiscordAuthSession";
import { makeAuthRequestBody } from "../utils/makeAuthRequestBody";
import { makeAuthRequestHeaders } from "../utils/makeAuthRequestHeaders";

/** Makes a POST request to the Discord token refresh URL to extend an existing OAuth session. */
export async function refreshAccessToken(
    refreshToken: UserToken,
    timer: ServerTimer,
): Promise<DiscordAuthData> {
    using _ = timer.create("discord/oauth2/token");

    const body = makeAuthRequestBody();

    body.set("refresh_token", refreshToken);
    body.set("grant_type", "refresh_token");

    try {
        const response = await fetch(OAuth2Routes.tokenURL, {
            body,
            headers: makeAuthRequestHeaders(),
            method: "post",
        });

        if (!response.ok) {
            throw await response.json();
        }

        const data = (await response.json()) as RESTPostOAuth2AccessTokenResult;

        return convertToDiscordAuthSession(data);
    } catch (error) {
        throw new SecondaryRequestError(
            {
                title: "Token Refresh Failure",
                description:
                    "Failed to refresh Discord OAuth session, it may have already expired.",
            },
            error,
        );
    }
}
