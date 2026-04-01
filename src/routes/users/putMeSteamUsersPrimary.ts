import { usersDb } from "@/databases/users";
import { NotFoundError } from "@/errors/NotFoundError";
import { steamConnectionService } from "@/services/steamConnectionService";
import type { SteamId64 } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Sets the primary Steam connection of the logged-in user's account. */
export const putMeSteamUsersPrimary: Endpoint<void, void, { id: SteamId64 }> = {
    auth: AuthScope.Session,
    method: "put",
    path: "/users/@me/steam-users/primary/:id",
    async handleRequest({ req, timer, session }) {
        const steamUsers = await steamConnectionService(session.accessToken, timer);

        const matchedUser = steamUsers.find((x) => x.id === req.params.id);

        if (matchedUser === undefined) {
            throw new NotFoundError({
                title: "Steam User Not Found",
                description:
                    "The given Steam user does not exist or is not connect to you Discord account.",
            });
        }

        await usersDb.setUserSteam(session.userId, matchedUser.id, timer);
    },
};
