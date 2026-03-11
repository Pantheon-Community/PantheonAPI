import { setUserSteam } from "@/databases/users/setUserSteam";
import { NotFoundError } from "@/errors/NotFoundError";
import { steamConnectionService } from "@/services/steamConnectionService";
import type { SteamId64 } from "@/shared/types/Common";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

interface PathParams {
    id: SteamId64;
}

export const putMeSteamUsersPrimary: Endpoint<void, void, PathParams> = {
    auth: AuthScope.Session,
    method: "put",
    path: "/users/@me/steam-users/primary/:id",
    async handleRequest({ req, timer, session }) {
        const steamUsers = await steamConnectionService(session.accessToken, timer);

        const matchedUser = steamUsers.find((x) => x.id === req.params.id);

        if (matchedUser === undefined) {
            throw new NotFoundError({
                title: "Steam User Not Found",
                description: "The given Steam connection is not linked to your Discord account.",
            });
        }

        await setUserSteam(session.userId, matchedUser.id, timer);
    },
};
