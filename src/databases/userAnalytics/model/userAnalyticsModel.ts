/** biome-ignore-all lint/style/useNamingConvention: SQL Column Syntax */

import type { DiscordId, Ip, UserAgent } from "@/shared/types/Common";

export interface UserAnalyticsModel {
	readonly id: DiscordId;

	readonly first_seen_at: Date;

	readonly last_seen_at: Date;

	readonly ip: Ip;

	readonly user_agent: UserAgent;

	readonly lifetime_action_count: number;
}
