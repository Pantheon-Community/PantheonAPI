import { replaceUserSession } from "@/databases/userSessions/replaceUserSession";
import { convertToUser } from "@/databases/users/model/convertToUser";
import { upsertUser } from "@/databases/users/upsertUser";
import { refreshAccessToken } from "@/discord/auth/refreshAccessToken";
import { fetchMe } from "@/discord/main/fetchMe";
import { steamConnectionUsersService } from "@/services/steamConnectionUsersService";
import type { AuthResponse } from "@/shared/types/AuthResponse";
import type { SteamUser } from "@/shared/types/SteamUser";
import type { User } from "@/shared/types/User";
import type { DiscordAuthData, DiscordUser } from "@/types/Discord";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";
import { getIp } from "@/utils/getIp";
import { getUserAgent } from "@/utils/getUserAgent";

export const postRefresh: EndpointProvider<void, AuthResponse> = {
	method: "post",
	path: "/refresh",
	auth: AuthScope.TokenOnly,
	noUpdateSessions: true,
	async handleRequest({ req, res, timer, session }) {
		// 1. refresh Discord login

		let authData: DiscordAuthData;

		{
			using _ = timer.create(refreshAccessToken);

			authData = await refreshAccessToken(session.refresh_token);
		}

		// 2. refetch Discord data

		let discordUser: DiscordUser;
		let steamUsers: SteamUser[];

		{
			using _ = timer.create(fetch, steamConnectionUsersService);

			const result = await Promise.all([
				fetchMe(authData.accessToken),
				steamConnectionUsersService(authData.accessToken),
			]);

			discordUser = result[0];
			steamUsers = result[1];
		}

		// 3. upsert user and replace existing session

		let user: User;

		{
			using _ = timer.create(upsertUser, replaceUserSession);

			const ip = getIp(req);

			const userAgent = getUserAgent(req);

			const [rawUser] = await Promise.all([
				upsertUser(discordUser, steamUsers.at(0)?.id ?? null),
				replaceUserSession(session, authData, ip, userAgent),
			]);

			user = convertToUser(rawUser, steamUsers.at(0) ?? null);
		}

		// done!

		timer.addTo(res).status(200).json({
			user,
			steamUsers,
			expiresAt: authData.expiresAt.toISOString(),
			token: authData.accessToken,
		});
	},
};
