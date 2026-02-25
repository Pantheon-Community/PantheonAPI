import { updateSession } from "@/databases/sessionModel/updateSession";
import { upsertUser } from "@/databases/userModel/upsertUser";
import { fetchMe } from "@/discord/fetchMe";
import { fetchMySteamConnections } from "@/discord/fetchMeSteamConnections";
import { refreshAccessToken } from "@/discord/refreshAccessToken";
import type { AuthResponse } from "@/shared/types/AuthResponse";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";
import { TimerBuilder } from "@/utils/timers";

const timers = {
	refAccessToken: "Discord OAuth",
	fetchUser: "Fetch /users/@me",
	upsertData: "Upsert user and session",
} as const;

const refreshTimers: TimerBuilder<keyof typeof timers> = new TimerBuilder(timers);

export const postRefresh: EndpointProvider<void, AuthResponse> = {
	method: "post",
	path: "/refresh",
	auth: AuthScope.TokenOnly,
	async handleRequest({ req, res, session }) {
		const timer = refreshTimers.makeInstance().start("refAccessToken");

		const authData = await refreshAccessToken(session.refresh_token);

		const token = authData.access_token;

		timer.stop("refAccessToken").start("fetchUser");

		const [discordData, steamConnections] = await Promise.all([
			fetchMe(token),
			fetchMySteamConnections(token),
		]);

		timer.stop("fetchUser").start("upsertData");

		const [user] = await Promise.all([
			upsertUser(discordData, steamConnections.at(0), req.ip),
			updateSession(session, authData),
		]);

		timer.stop("upsertData").addTo(res);

		res.status(200).json({ user, steamConnections, expiresIn: authData.expires_in, token });
	},
};
