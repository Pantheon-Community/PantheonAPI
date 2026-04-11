import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import type { DiscordAuthData } from "@/types/Discord";
import type { ServerTimer } from "@/utils/serverTimer";
import { OAuth2Routes, type RESTPostOAuth2AccessTokenResult } from "discord-api-types/v10";
import { convertToDiscordAuthSession } from "../utils/convertToDiscordAuthSession";
import { makeAuthRequestBody } from "../utils/makeAuthRequestBody";
import { makeAuthRequestHeaders } from "../utils/makeAuthRequestHeaders";

/**
 * Makes a POST request to the Discord token URL to upgrade an authorisation code into an access
 * token.
 */
export async function requestAccessToken(
    code: string,
    redirectUri: string,
    timer: ServerTimer,
): Promise<DiscordAuthData> {
    using _ = timer.create("requestAccessToken");

    const body = makeAuthRequestBody();

    body.set("code", code);
    body.set("redirect_uri", redirectUri);
    body.set("grant_type", "authorization_code");

    try {
        const response = await fetch(OAuth2Routes.tokenURL, {
            body,
            headers: makeAuthRequestHeaders(),
            method: "post",
        });

        const data = await response.json();

        if (!response.ok) {
            throw data;
        }

        return convertToDiscordAuthSession(data as RESTPostOAuth2AccessTokenResult);
    } catch (error) {
        throw new SecondaryRequestError(
            {
                title: "Token Request Failure",
                description:
                    "Failed to obtain a Discord access token, the supplied code or redirect URI may be invalid.",
            },
            error,
        );
    }
}
