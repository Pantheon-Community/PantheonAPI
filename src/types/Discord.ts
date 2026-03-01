/** biome-ignore-all lint/style/useNamingConvention: Discord API Types */

import type { APIUser } from "discord-api-types/v10";
import type { DiscordId, SteamId64 } from "@/shared/types/Common";
import type { UserSession } from "@/shared/types/UserSession";

export interface DiscordAuthData extends Pick<UserSession, "accessToken" | "refreshToken"> {
	expiresAt: Date;
}

export interface DiscordUser extends Omit<APIUser, "id"> {
	id: DiscordId;
}

export interface DiscordSteamConnection {
	readonly id: SteamId64;

	readonly username: string;
}
