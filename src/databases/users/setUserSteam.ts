import { pg } from "@/global/pg";
import type { DiscordId, SteamId64 } from "@/shared/types/Common";
import { wrapPgError } from "../utils/handlePgError";

export async function setUserSteam(discordId: DiscordId, steamId: SteamId64 | null): Promise<void> {
    try {
        await pg`UPDATE users SET steam_id = ${steamId} WHERE id = ${discordId}`;
    } catch (error) {
        throw wrapPgError(error);
    }
}
