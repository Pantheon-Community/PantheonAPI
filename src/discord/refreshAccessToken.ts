import { OAuth2Routes } from "discord-api-types/v10";
import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import type { UserToken } from "@/shared/types/Common";
import type { DiscordAuth } from "@/types/Discord";
import { makeRequestBody } from "./makeRequestBody";

/**
 * Makes a POST request to the Discord token refresh URL, which extends an existing OAuth session.
 */
export async function refreshAccessToken(refreshToken: UserToken): Promise<DiscordAuth> {
	const body = makeRequestBody();

	body.set("refresh_token", refreshToken);
	body.set("grant_type", "refresh_token");

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
				title: "Token Refresh Failure",
				description:
					"Failed to refresh Discord OAuth session, it may have already expired.",
			},
			error,
		);
	}
}
