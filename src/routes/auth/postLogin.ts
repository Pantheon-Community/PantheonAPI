import { createSession } from "@/databases/sessionModel/createSession";
import { upsertUser } from "@/databases/userModel/upsertUser";
import { fetchMe } from "@/discord/fetchMe";
import { fetchMySteamConnections } from "@/discord/fetchMeSteamConnections";
import { requestAccessToken } from "@/discord/requestAccessToken";
import type { AuthResponse } from "@/shared/types/AuthResponse";
import type { LoginRequest } from "@/shared/types/LoginRequest";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";
import { getIp } from "@/utils/getIp";
import { getUserAgent } from "@/utils/getUserAgent";

export const postLogin: EndpointProvider<LoginRequest, AuthResponse> = {
	method: "post",
	path: "/login",
	auth: AuthScope.None,
	async handleRequest({ req, res, timer }) {
		const { code, redirectUri } = req.body;

		const authData = await requestAccessToken(code, redirectUri);

		timer.finished(requestAccessToken);

		const token = authData.access_token;

		const ip = getIp(req);

		const [discordData, steamConnections] = await Promise.all([
			fetchMe(token),
			fetchMySteamConnections(token),
		]);

		timer.finished(fetchMe, fetchMySteamConnections);

		const user = await upsertUser(discordData, steamConnections.at(0), ip);

		timer.finished(upsertUser);

		await createSession(authData, discordData.id, ip, getUserAgent(req));

		timer.finished(createSession);

		timer.addTo(res);

		res.status(200).json({ user, steamConnections, expiresIn: authData.expires_in, token });
	},
};
