import { sql } from "bun";
import { pg } from "@/global/pg";
import type { SteamId64 } from "@/shared/types/Common";
import { wrapPgError } from "../utils/handlePgError";
import type { UserModel } from "./model/userModel";

interface UserModelWithSteamId extends UserModel {
	// biome-ignore lint/style/useNamingConvention:inherited
	steam_id: NonNullable<UserModel["steam_id"]>;
}

export async function getAllUsersBySteamIds(
	steamIds: SteamId64[],
): Promise<UserModelWithSteamId[]> {
	try {
		return await pg`SELECT * FROM users WHERE steam_id = ANY(${sql.array(steamIds, "TEXT")})`;
	} catch (error) {
		throw wrapPgError(error);
	}
}
