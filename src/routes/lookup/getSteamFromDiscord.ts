import {
	type BasicSteamInfoByDiscordId,
	getBasicSteamInfoByDiscordIds,
} from "@/databases/steamUsers/getBasicSteamInfoByDiscordIds";
import type { DiscordId } from "@/shared/types/Common";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

interface QueryParams {
	ids: DiscordId[];
}

export const getSteamFromDiscord: EndpointProvider<
	void,
	BasicSteamInfoByDiscordId[],
	void,
	QueryParams
> = {
	method: "get",
	path: "/lookup/discord-to-steam",
	auth: AuthScope.None,
	async handleRequest({ req, res, timer }) {
		let users: BasicSteamInfoByDiscordId[];

		{
			using _ = timer.create(getBasicSteamInfoByDiscordIds);

			users = await getBasicSteamInfoByDiscordIds(req.query.ids);
		}

		timer.addTo(res).status(200).json(users);
	},
};
