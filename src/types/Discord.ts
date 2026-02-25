/** biome-ignore-all lint/style/useNamingConvention: Discord API Types */

import type { APIUser, RESTPostOAuth2AccessTokenResult } from "discord-api-types/v10";
import type { DiscordId, UserToken } from "@/shared/types/Common";

export interface DiscordAuth
	extends Omit<RESTPostOAuth2AccessTokenResult, "access_token" | "refresh_token"> {
	access_token: UserToken;

	refresh_token: UserToken;
}

export interface DiscordUser extends Omit<APIUser, "id"> {
	id: DiscordId;
}
