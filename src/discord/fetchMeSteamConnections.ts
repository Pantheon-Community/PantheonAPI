/** biome-ignore-all lint/style/useNamingConvention: HTTP Headers */

import { type APIConnection, ConnectionService, RouteBases } from "discord-api-types/v10";
import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import type { SteamId64, UserToken } from "@/shared/types/Common";
import type { SteamConnection } from "@/shared/types/SteamConnection";

export async function fetchMySteamConnections(token: UserToken): Promise<SteamConnection[]> {
	try {
		const data = await fetch(`${RouteBases.api}/users/@me/connections`, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
			},
		});

		if (!data.ok) {
			throw await data.json();
		}

		const allConnections = (await data.json()) as APIConnection[];

		const output: SteamConnection[] = [];

		for (const connection of allConnections) {
			if (connection.type !== ConnectionService.Steam) continue;
			if (connection.revoked) continue;
			if (!connection.verified) continue;

			output.push({
				id: connection.id as SteamId64,
				username: connection.name,
			});
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
