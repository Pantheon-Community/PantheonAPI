/** biome-ignore-all lint/style/useNamingConvention: SQL Column Syntax */

import type { SteamId64 } from "@/shared/types/Common";

export interface SteamUserModel {
	readonly id: SteamId64;

	readonly username: string;

	readonly first_seen_at: Date | null;

	readonly last_seen_at: Date | null;

	readonly times_seen: number;
}
