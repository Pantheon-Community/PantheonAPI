import { pg } from "@/global/pg";
import type { DiscordId, SteamId64 } from "@/shared/types/Common";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "../utils/handlePgError";

export async function setUserSteam(
    discordId: DiscordId,
    steamId: SteamId64 | null,
    timer: ServerTimer,
): Promise<void> {
    using _ = timer.create("setUserSteam");

    try {
        await pg`UPDATE users SET steam_id = ${steamId} WHERE id = ${discordId}`;
    } catch (error) {
        throw wrapPgError(error);
    }
}
