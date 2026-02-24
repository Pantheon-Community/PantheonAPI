/** biome-ignore-all lint/style/useNamingConvention: SQL Column Syntax */

import type { DiscordId, IsoString, SteamId64 } from "@/shared/Common";
import type { EconomyPermissions } from "@/shared/Permissions/EconomyPermissions";
import type { GeneralPermissions } from "@/shared/Permissions/GeneralPermissions";
import type { SteamConnection } from "@/shared/SteamConnection";
import type { User, UserMeta } from "@/shared/User";

export interface UserModel {
	readonly id: DiscordId;

	readonly username: string;

	readonly avatar: string | null;

	readonly latest_ip: string;

	readonly session_count: number;

	readonly steam_id: SteamId64 | null;

	readonly steam_username: string | null;

	readonly first_seen_at: IsoString;

	readonly last_seen_at: IsoString;

	readonly first_seen_at_steam: IsoString | null;

	readonly last_seen_at_steam: IsoString | null;

	readonly general_permissions: GeneralPermissions;

	readonly economy_permissions: EconomyPermissions;
}

export function convertToUser(model: UserModel): User {
	let steam: SteamConnection | null = null;
	let steamMeta: UserMeta | null = null;

	if (model.steam_id !== null && model.steam_username !== null) {
		steam = { id: model.steam_id, username: model.steam_username };
	}

	if (model.first_seen_at_steam !== null && model.last_seen_at_steam !== null) {
		steamMeta = {
			firstSeenAt: model.first_seen_at_steam,
			lastSeenAt: model.last_seen_at_steam,
		};
	}

	return {
		id: model.id,
		username: model.username,
		avatar: model.avatar,
		latestIp: model.latest_ip,
		sessionCount: model.session_count,
		steam,
		meta: { firstSeenAt: model.first_seen_at, lastSeenAt: model.last_seen_at },
		steamMeta,
		permissions: {
			generalPermissions: model.general_permissions,
			economyPermissions: model.economy_permissions,
		},
	};
}
