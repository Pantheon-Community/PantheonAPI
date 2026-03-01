/** biome-ignore-all lint/style/useNamingConvention: HTTP Headers */

import { type APIConnection, ConnectionService, RouteBases } from "discord-api-types/v10";
import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import type { SteamId64, UserToken } from "@/shared/types/Common";
import type { DiscordSteamConnection } from "@/types/Discord";
import { makeElevatedRequestHeaders } from "../utils/makeElevatedRequestHeaders";

export async function fetchMySteamConnections(token: UserToken): Promise<DiscordSteamConnection[]> {
	try {
		const response = await fetch(`${RouteBases.api}/users/@me/connections`, {
			headers: makeElevatedRequestHeaders(token),
		});

		if (!response.ok) {
			throw await response.json();
		}

		const allConnections = (await response.json()) as APIConnection[];

		const output: DiscordSteamConnection[] = [];

		for (const connection of allConnections) {
			if (connection.type !== ConnectionService.Steam) {
				// we don't care about non-steam connections
				continue;
			}

			if (connection.revoked || !connection.verified) {
				// these fields aren't well documented, but better safe than sorry?
				// https://docs.discord.com/developers/resources/user#connection-object
				continue;
			}

			output.push({ id: connection.id as SteamId64, username: connection.name });
		}

		return output;
	} catch (error) {
		throw new SecondaryRequestError(
			{
				title: "Connections Fetch Failure",
				description: "Unable to fetch user connections, your access token may be expired.",
			},
			error,
		);
	}
}
