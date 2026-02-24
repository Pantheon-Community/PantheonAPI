/** biome-ignore-all lint/style/useNamingConvention: HTTP Headers */

import { RouteBases } from "discord-api-types/v10";
import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import type { UserToken } from "@/shared/Common";
import type { DiscordUser } from "@/types/Discord";

export async function fetchMe(token: UserToken): Promise<DiscordUser> {
	try {
		const data = await fetch(`${RouteBases.api}/users/@me`, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
			},
		});

		if (!data.ok) {
			throw await data.json();
		}

		return (await data.json()) as DiscordUser;
	} catch (error) {
		throw new SecondaryRequestError(
			{
				title: "User Fetch Failure",
				description: "Unable to fetch Discord user info, your access token may be expired.",
			},
			error,
		);
	}
}
