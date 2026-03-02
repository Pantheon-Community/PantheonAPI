import { getAllUsersBySteamIds } from "@/databases/users/getAllUsersBySteamIds";
import { convertToUser } from "@/databases/users/model/convertToUser";
import type { SteamId64 } from "@/shared/types/Common";
import type { UserViaSteamLookup } from "@/shared/types/UserViaSteamLookup";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

interface QueryParams {
	ids: SteamId64[];
}

export const getDiscordFromSteam: EndpointProvider<void, UserViaSteamLookup[], void, QueryParams> =
	{
		method: "get",
		path: "/lookup/steam-to-discord",
		auth: AuthScope.None,
		async handleRequest({ req, res, timer }) {
			let users: UserViaSteamLookup[];

			{
				using _ = timer.create(getAllUsersBySteamIds);

				const result = await getAllUsersBySteamIds(req.query.ids);

				users = result.map((x) => {
					const { steam, ...rest } = convertToUser(x, null);

					return { ...rest, steamId: x.steam_id };
				});
			}

			timer.addTo(res).status(200).json(users);
		},
	};
