import { updateSession } from "@/databases/sessionModel/updateSession";
import { upsertUser } from "@/databases/userModel/upsertUser";
import { fetchMe } from "@/discord/fetchMe";
import { fetchMySteamConnections } from "@/discord/fetchMeSteamConnections";
import { refreshAccessToken } from "@/discord/refreshAccessToken";
import type { AuthResponse } from "@/shared/types/AuthResponse";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";
import { getIp } from "@/utils/getIp";
import { getUserAgent } from "@/utils/getUserAgent";

export const postRefresh: EndpointProvider<void, AuthResponse> = {
	method: "post",
	path: "/refresh",
	auth: AuthScope.TokenOnly,
	async handleRequest({ req, res, timer, session }) {
		const authData = await refreshAccessToken(session.refresh_token);

		timer.finished(refreshAccessToken);

		const token = authData.access_token;

		const ip = getIp(req);

		const [discordData, steamConnections] = await Promise.all([
			fetchMe(token),
			fetchMySteamConnections(token),
		]);

		timer.finished(fetchMe, fetchMySteamConnections);

		const [user] = await Promise.all([
			upsertUser(discordData, steamConnections.at(0), ip),
			updateSession(session, authData, ip, getUserAgent(req)),
		]);

		timer.finished(upsertUser, updateSession);

		timer.addTo(res);

		res.status(200).json({ user, steamConnections, expiresIn: authData.expires_in, token });
	},
};
