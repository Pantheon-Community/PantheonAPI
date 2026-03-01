/** biome-ignore-all lint/style/useNamingConvention: SQL Column Syntax */

import type { DiscordId, Ip, UserAgent, UserToken } from "@/shared/types/Common";

export interface UserSessionModel {
	readonly access_token: UserToken;

	readonly refresh_token: UserToken;

	readonly started_at: Date;

	readonly expires_at: Date;

	readonly times_refreshed: number;

	readonly user_id: DiscordId;

	readonly ip: Ip;

	readonly user_agent: UserAgent;

	readonly action_count: number;

	readonly last_action_at: Date;
}
