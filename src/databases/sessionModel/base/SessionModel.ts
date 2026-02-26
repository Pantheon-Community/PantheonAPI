/** biome-ignore-all lint/style/useNamingConvention: SQL Column Syntax */

import type { DiscordId, UserToken } from "@/shared/types/Common";

export interface SessionModel {
	readonly access_token: UserToken;

	readonly refresh_token: UserToken;

	readonly started_at: Date;

	readonly expires_at: Date;

	readonly times_refreshed: number;

	readonly user_id: DiscordId;

	readonly ip: string;

	readonly user_agent: string;
}
