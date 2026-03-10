import { config } from "@/global/config";

const { clientId, clientSecret } = config.discord;

/**
 * Contructs a request body for Discord OAuth endpoints.
 *
 * {@link https://docs.discord.com/developers/topics/oauth2#authorization-code-grant Discord Reference}
 */
export function makeAuthRequestBody(): URLSearchParams {
    return new URLSearchParams([
        ["client_id", clientId],
        ["client_secret", clientSecret],
    ]);
}
