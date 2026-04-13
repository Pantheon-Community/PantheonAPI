import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import { steamConnectionService } from "@/services/steamConnectionService";
import { STEAM_ID_64, type SteamId64 } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";

export const putMeSteamUsersPrimary: Endpoint<void, void, { id: SteamId64 }> = {
    auth: AuthScope.Session,
    method: "put",
    path: "/users/@me/steam-users/primary/:id",
    description: "Sets the primary Steam connection for the current user.",
    returns: "Success, no content.",
    tag: "Users",
    flags: EndpointFlags.MakesSecondaryRequests | EndpointFlags.NoContent,
    requestBody: null,
    responseBody: null,
    pathParams: makeParams({ id: STEAM_ID_64 }),
    queryParams: null,
    async handleRequest({ req, timer, session }) {
        const steamUsers = await steamConnectionService(session.accessToken, timer);

        const matchedUser = steamUsers.find((x) => x.id === req.params.id);

        if (matchedUser === undefined) {
            throw new NotFoundError({
                title: "Steam User Not Found",
                description:
                    "The given Steam user does not exist or is not connect to your Discord account.",
            });
        }

        using _ = timer.create("putMeSteamUsersPrimary");

        try {
            await pg`UPDATE users SET steam_id = ${req.params.id} WHERE id = ${session.userId}`;
        } catch (error) {
            throw wrapPgError(error);
        }
    },
};
