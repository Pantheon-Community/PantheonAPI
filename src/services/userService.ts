import { usersDb } from "@/databases/users";
import { fetchMe } from "@/other/discord/main/fetchMe";
import type { UserToken } from "@/shared/types/Common";
import type { GetMeResponse } from "@/shared/types/Responses/GetMeResponse";
import type { RequestAnalytics } from "@/types/RequestAnalytics";
import type { ServerTimer } from "@/utils/serverTimer";
import { steamConnectionService } from "./steamConnectionService";

/** Fetches the Discord user and their given Steam connections, updating both in the database. */
export async function userService(
    token: UserToken,
    analytics: RequestAnalytics,
    timer: ServerTimer,
): Promise<GetMeResponse> {
    const [discordUser, steamUsers] = await Promise.all([
        fetchMe(token, timer),
        steamConnectionService(token, timer),
    ]);

    const user = await usersDb.addOrUpdateUser(discordUser, steamUsers, analytics, timer);

    return { user, steamUsers };
}
