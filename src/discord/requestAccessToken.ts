import { OAuth2Routes } from "discord-api-types/v10";
import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import type { DiscordAuth } from "@/types/Discord";
import { makeRequestBody } from "./makeRequestBody";

/**
 * Makes a POST request to the Discord token URL, which upgrades an authorisation code into an
 * access token.
 */
export async function requestAccessToken(code: string, redirectUri: string): Promise<DiscordAuth> {
	const body = makeRequestBody();

	body.set("code", code);
	body.set("redirect_uri", redirectUri);
	body.set("grant_type", "authorization_code");

	try {
		const data = await fetch(OAuth2Routes.tokenURL, {
			body,
			headers: { "Accept-Encoding": "application/json" },
			method: "POST",
		});

		if (!data.ok) {
			throw await data.json();
		}

		return (await data.json()) as DiscordAuth;
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
