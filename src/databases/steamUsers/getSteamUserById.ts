import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { SteamId64 } from "@/shared/types/Common";
import type { SteamUserModel } from "./model/steamUserModel";

export async function getSteamUserById(id: SteamId64): Promise<SteamUserModel> {
	const result = await pg<SteamUserModel[]>`SELECT * FROM steam_users WHERE id = ${id}`;

	if (result.length === 0) {
		throw new NotFoundError({
			title: "Steam User Not Found",
			description: "A Steam user with this ID does not exist in the database.",
		});
	}

	return result[0];
}
