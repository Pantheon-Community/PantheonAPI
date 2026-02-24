import { config } from "@/global/config";

const { clientId, clientSecret } = config.discord;

/** Contructs an authenticated request body to send to any of the Discord OAuth endpoints. */
export function makeRequestBody(): URLSearchParams {
	return new URLSearchParams([
		["client_id", clientId],
		["client_secret", clientSecret],
	]);
}
