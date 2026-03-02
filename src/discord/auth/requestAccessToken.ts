import { OAuth2Routes, type RESTPostOAuth2AccessTokenResult } from "discord-api-types/v10";
import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import type { DiscordAuthData } from "@/types/Discord";
import { convertToDiscordAuthSession } from "../utils/convertToDiscordAuthSession";
import { makeAuthRequestBody } from "../utils/makeAuthRequestBody";
import { makeAuthRequestHeaders } from "../utils/makeAuthRequestHeaders";

/**
 * Makes a POST request to the Discord token URL, which upgrades an authorization code into an
 * access token.
 */
export async function requestAccessToken(
	code: string,
	redirectUri: string,
): Promise<DiscordAuthData> {
	const body = makeAuthRequestBody();

	body.set("code", code);
	body.set("redirect_uri", redirectUri);
	body.set("grant_type", "authorization_code");

	try {
		const response = await fetch(OAuth2Routes.tokenURL, {
			body,
			headers: makeAuthRequestHeaders(),
			method: "POST",
		});

		if (!response.ok) {
			throw await response.json();
		}

		const data = (await response.json()) as RESTPostOAuth2AccessTokenResult;

		return convertToDiscordAuthSession(data);
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
