import { createSession } from "@/databases/sessionModel/createSession";
import { upsertUser } from "@/databases/userModel/upsertUser";
import { fetchMe } from "@/discord/fetchMe";
import { fetchMySteamConnections } from "@/discord/fetchMeSteamConnections";
import { requestAccessToken } from "@/discord/requestAccessToken";
import type { AuthResponse } from "@/shared/types/AuthResponse";
import type { LoginRequest } from "@/shared/types/LoginRequest";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";
import { TimerBuilder } from "@/utils/timers";

const timers = {
	reqAccessToken: "Discord OAuth",
	fetchUser: "Fetch /users/@me",
	upsertUser: "Upsert user",
	createSession: "Create session",
} as const;

const loginTimers: TimerBuilder<keyof typeof timers> = new TimerBuilder(timers);

export const postLogin: EndpointProvider<LoginRequest, AuthResponse> = {
	method: "post",
	path: "/login",
	auth: AuthScope.None,
	async handleRequest({ req, res }) {
		const { code, redirectUri } = req.body;

		const timer = loginTimers.makeInstance().start("reqAccessToken");

		const authData = await requestAccessToken(code, redirectUri);

		timer.stop("reqAccessToken").start("fetchUser");

		const token = authData.access_token;

		const [discordData, steamConnections] = await Promise.all([
			fetchMe(token),
			fetchMySteamConnections(token),
		]);

		timer.stop("fetchUser").start("upsertUser");

		const user = await upsertUser(discordData, steamConnections.at(0), req.ip);

		timer.stop("upsertUser").start("createSession");

		await createSession(authData, discordData.id);

		timer.stop("createSession").addTo(res);

		res.status(200).json({ user, steamConnections, expiresIn: authData.expires_in, token });
	},
};
