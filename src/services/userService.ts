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

    const { upsertedUser, steamId } = await usersDb.addOrUpdateUser(
        discordUser,
        steamUsers[0]?.id,
        analytics,
        timer,
    );

    // the below .find() can return null if the user removed the primary steam connection from
    // their account, however this edge case is ultimately more effort than it's worth to routinely
    // check
    const steam = steamId ? (steamUsers.find((x) => x.id === steamId) ?? null) : null;

    return { user: Object.assign(upsertedUser, { steam }), steamUsers };
}
