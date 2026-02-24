import { OAuth2Routes } from "discord-api-types/v10";
import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import type { UserToken } from "@/shared/Common";
import { makeRequestBody } from "./makeRequestBody";

/**
 * Makes a POST request to the Discord token revocation URL, which revokes an existing access
 * token.
 */
export async function revokeAccessToken(accessToken: UserToken): Promise<void> {
	const body = makeRequestBody();

	body.set("token", accessToken);

	try {
		const res = await fetch(OAuth2Routes.tokenRevocationURL, { body, method: "POST" });

		if (!res.ok) {
			throw await res.json();
		}
	} catch (error) {
		throw new SecondaryRequestError(
			{
				title: "Token Revocation Failure",
				description:
					"Failed to revoke Discord access token, the session may have already been destroyed.",
			},
			error,
		);
	}
}
