import { updateSession } from "@/databases/sessionModel/updateSession";
import { upsertUser } from "@/databases/userModel/upsertUser";
import { fetchMe } from "@/discord/fetchMe";
import { fetchMySteamConnections } from "@/discord/fetchMeSteamConnections";
import { refreshAccessToken } from "@/discord/refreshAccessToken";
import type { AuthResponse } from "@/shared/AuthResponse";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

export const postRefresh: EndpointProvider<void, AuthResponse> = {
	method: "post",
	path: "/refresh",
	auth: AuthScope.TokenOnly,
	async handleRequest({ req, res, session }) {
		const authData = await refreshAccessToken(session.refresh_token);

		const token = authData.access_token;

		const [discordData, steamConnections] = await Promise.all([
			fetchMe(token),
			fetchMySteamConnections(token),
		]);

		const [user] = await Promise.all([
			upsertUser(discordData, steamConnections.at(0), req.ip),
			updateSession(session, authData),
		]);

		res.status(200).json({ user, steamConnections, expiresIn: authData.expires_in, token });
	},
};
