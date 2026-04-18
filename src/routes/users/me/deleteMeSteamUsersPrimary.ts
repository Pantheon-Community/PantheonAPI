import { pg } from "@/global/pg";
import { UserPermissions } from "@/shared/types/Permissions/UserPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";

export const deleteMeSteamUsersPrimary: Endpoint = {
    auth: AuthScope.Permission,
    method: "delete",
    path: "/users/@me/steam-users/primary",
    description: "Clears the primary Steam connection of the current user.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent,
    requestBody: null,
    responseBody: null,
    pathParams: null,
    queryParams: null,
    permissions: { userPermissions: UserPermissions.DeletePrimaryConnection },
    async handleRequest({ timer, session }) {
        using _ = timer.create("deleteMeSteamUsersPrimary");

        await pg`UPDATE users SET steam_id = NULL WHERE id = ${session.userId}`;
    },
};
