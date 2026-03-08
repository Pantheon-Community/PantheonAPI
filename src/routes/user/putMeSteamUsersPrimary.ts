import { setUserSteam } from "@/databases/users/setUserSteam";
import { NotFoundError } from "@/errors/NotFoundError";
import { steamConnectionUsersService } from "@/services/steamConnectionUsersService";
import type { SteamId64 } from "@/shared/types/Common";
import type { SteamUserBasicWithTimes } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

interface PathParams {
    id: SteamId64;
}

export const putMeSteamUsersPrimary: Endpoint<void, void, PathParams> = {
    auth: AuthScope.TokenOnly,
    method: "put",
    path: "/users/@me/steam-users/primary/:id",
    async handleRequest({ req, res, timer, session }) {
        let steamUsers: SteamUserBasicWithTimes[];

        {
            using _ = timer.create(steamConnectionUsersService);

            steamUsers = await steamConnectionUsersService(session.accessToken);
        }

        const matchedUser = steamUsers.find((x) => x.id === req.params.id);

        if (matchedUser === undefined) {
            throw new NotFoundError({
                title: "Steam User Not Found",
                description:
                    "The given Steam connection is not linked to your Discord account or does not exist in our database.",
            });
        }

        {
            using _ = timer.create(setUserSteam);

            await setUserSteam(session.userId, matchedUser.id);
        }

        timer.addTo(res).sendStatus(200);
    },
};
