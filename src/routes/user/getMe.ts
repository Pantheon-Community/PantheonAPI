import { convertToUser } from "@/databases/users/model/convertToUser";
import { upsertUser } from "@/databases/users/upsertUser";
import { fetchMe } from "@/discord/main/fetchMe";
import { steamConnectionUsersService } from "@/services/steamConnectionUsersService";
import type { GetMeResponse } from "@/shared/types/GetMeResponse";
import type { SteamUser } from "@/shared/types/SteamUser";
import type { User } from "@/shared/types/User";
import type { DiscordUser } from "@/types/Discord";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

export const getMe: EndpointProvider<void, GetMeResponse> = {
	method: "get",
	path: "/users/@me",
	auth: AuthScope.User,
	async handleRequest({ res, timer, session }) {
		let discordUser: DiscordUser;
		let steamUsers: SteamUser[];

		{
			using _ = timer.create(fetchMe, steamConnectionUsersService);

			const result = await Promise.all([
				fetchMe(session.access_token),
				steamConnectionUsersService(session.access_token),
			]);

			discordUser = result[0];
			steamUsers = result[1];
		}

		let user: User;

		{
			using _ = timer.create(upsertUser);

			const rawUser = await upsertUser(discordUser, steamUsers.at(0)?.id ?? null);

			user = convertToUser(rawUser, steamUsers.at(0) ?? null);
		}

		timer.addTo(res).status(200).json({ user, steamUsers });
	},
};
