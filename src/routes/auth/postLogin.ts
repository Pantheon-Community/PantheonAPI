import { upsertUserAnalytics } from "@/databases/userAnalytics/upsertUserAnalytics";
import { createUserSession } from "@/databases/userSessions/createUserSession";
import { convertToUser } from "@/databases/users/model/convertToUser";
import { upsertUser } from "@/databases/users/upsertUser";
import { requestAccessToken } from "@/discord/auth/requestAccessToken";
import { fetchMe } from "@/discord/main/fetchMe";
import { steamConnectionUsersService } from "@/services/steamConnectionUsersService";
import type { AuthResponse } from "@/shared/types/AuthResponse";
import type { LoginRequest } from "@/shared/types/LoginRequest";
import type { SteamUser } from "@/shared/types/SteamUser";
import type { User } from "@/shared/types/User";
import type { DiscordAuthData, DiscordUser } from "@/types/Discord";
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

		// 1. login to Discord

		let authData: DiscordAuthData;

		{
			using _ = timer.create(requestAccessToken);

			authData = await requestAccessToken(code, redirectUri);
		}

		// 2. fetch Discord data

		let discordUser: DiscordUser;
		let steamUsers: SteamUser[];

		{
			using _ = timer.create(fetchMe, steamConnectionUsersService);

			const result = await Promise.all([
				fetchMe(authData.accessToken),
				steamConnectionUsersService(authData.accessToken),
			]);

			discordUser = result[0];
			steamUsers = result[1];
		}

		// 3. upsert user

		let user: User;

		{
			using _ = timer.create(upsertUser);

			const rawUser = await upsertUser(discordUser, steamUsers.at(0)?.id ?? null);

			user = convertToUser(rawUser, steamUsers.at(0) ?? null);
		}

		// 4. create new user session and upsert user analytics

		{
			using _ = timer.create(createUserSession, upsertUserAnalytics);

			const ip = getIp(req);

			const userAgent = getUserAgent(req);

			await Promise.all([
				createUserSession(authData, user.id, ip, userAgent),
				upsertUserAnalytics(user.id, ip, userAgent),
			]);
		}

		// 5. done!

		timer.addTo(res).status(200).json({
			user,
			steamUsers,
			expiresAt: authData.expiresAt.toISOString(),
			token: authData.accessToken,
		});
	},
};
