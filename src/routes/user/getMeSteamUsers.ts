import { steamConnectionUsersService } from "@/services/steamConnectionUsersService";
import type { SteamUser } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

export const getMeSteamUsers: EndpointProvider<void, SteamUser[]> = {
	method: "get",
	path: "/users/@me/steam-users",
	auth: AuthScope.TokenOnly,
	async handleRequest({ res, timer, session }) {
		let steamUsers: SteamUser[];

		{
			using _ = timer.create(steamConnectionUsersService);

			steamUsers = await steamConnectionUsersService(session.access_token);
		}

		timer.addTo(res).status(200).json(steamUsers);
	},
};
