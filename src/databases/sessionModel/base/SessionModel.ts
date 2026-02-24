/** biome-ignore-all lint/style/useNamingConvention: SQL Column Syntax */

import type { DiscordId, IsoString, UserToken } from "@/shared/Common";

export interface SessionModel {
	readonly access_token: UserToken;

	readonly refresh_token: UserToken;

	readonly started_at: IsoString;

	readonly expires_at: IsoString;

	readonly times_refreshed: number;

	readonly user_id: DiscordId;
}
