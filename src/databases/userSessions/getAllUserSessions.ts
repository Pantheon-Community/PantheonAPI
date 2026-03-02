import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";
import { wrapPgError } from "../utils/handlePgError";
import type { UserSessionModel } from "./model/userSessionsModel";

export async function getAllUserSessions(id: DiscordId): Promise<UserSessionModel[]> {
	try {
		return await pg`
            SELECT * FROM user_sessions WHERE user_id = ${id} AND expires_at > NOW()
        `;
	} catch (error) {
		throw wrapPgError(error);
	}
}
