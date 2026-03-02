import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { SteamId64 } from "@/shared/types/Common";
import { wrapPgError } from "../utils/handlePgError";
import type { SteamUserModel } from "./model/steamUserModel";

export async function getSteamUserById(id: SteamId64): Promise<SteamUserModel> {
	let result: SteamUserModel[];

	try {
		result = await pg`SELECT * FROM steam_users WHERE id = ${id}`;
	} catch (error) {
		throw wrapPgError(error);
	}

	if (result.length === 0) {
		throw new NotFoundError({
			title: "Steam User Not Found",
			description: "A Steam user with this ID does not exist in the database.",
		});
	}

	return result[0];
}
