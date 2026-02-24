import { createSession } from "@/databases/sessionModel/createSession";
import { upsertUser } from "@/databases/userModel/upsertUser";
import { fetchMe } from "@/discord/fetchMe";
import { fetchMySteamConnections } from "@/discord/fetchMeSteamConnections";
import { requestAccessToken } from "@/discord/requestAccessToken";
import type { AuthResponse } from "@/shared/AuthResponse";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

interface LoginRequest {
	code: string;

	redirectUri: string;
}

export const postLogin: EndpointProvider<LoginRequest, AuthResponse> = {
	method: "post",
	path: "/login",
	auth: AuthScope.None,
	async handleRequest({ req, res }) {
		const { code, redirectUri } = req.body;

		const authData = await requestAccessToken(code, redirectUri);

		const token = authData.access_token;

		const [discordData, steamConnections] = await Promise.all([
			fetchMe(token),
			fetchMySteamConnections(token),
		]);

		const user = await upsertUser(discordData, steamConnections.at(0), req.ip);

		await createSession(authData, discordData.id);

		res.status(200).json({ user, steamConnections, expiresIn: authData.expires_in, token });
	},
};
