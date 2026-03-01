/** biome-ignore-all lint/style/useNamingConvention: SQL Column Syntax */

import type { DiscordId, SteamId64 } from "@/shared/types/Common";

export interface UserModel {
	readonly id: DiscordId;

	readonly username: string;

	readonly avatar: string | null;

	readonly steam_id: SteamId64 | null;
}
