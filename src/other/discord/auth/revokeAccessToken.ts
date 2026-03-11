import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import type { UserToken } from "@/shared/types/Common";
import type { ServerTimer } from "@/utils/serverTimer";
import { OAuth2Routes } from "discord-api-types/v10";
import { makeAuthRequestBody } from "../utils/makeAuthRequestBody";
import { makeAuthRequestHeaders } from "../utils/makeAuthRequestHeaders";

/**
 * Makes a POST request to the Discord token revocation URL, which revokes an existing access
 * token.
 */
export async function revokeAccessToken(accessToken: UserToken, timer: ServerTimer): Promise<void> {
    using _ = timer.create("discord>oauth2>token>revoke");

    const body = makeAuthRequestBody();

    body.set("token", accessToken);

    try {
        const response = await fetch(OAuth2Routes.tokenRevocationURL, {
            body,
            headers: makeAuthRequestHeaders(),
            method: "post",
        });

        if (!response.ok) {
            throw await response.json();
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
