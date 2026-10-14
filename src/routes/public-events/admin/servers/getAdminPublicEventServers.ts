import { getAdminServers } from "@/services/publicEvents";
import { EVENT_ADMIN_SERVER } from "@/shared/types/PublicEvents";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { makeArray } from "@/utils/specUtils";

export const getAdminPublicEventServers: Endpoint<
    void,
    Awaited<ReturnType<typeof getAdminServers>>
> = {
    method: "get",
    path: "/public-events/admin/servers",
    auth: AuthScope.Permission,
    description:
        "Gets purchasable event servers with their bound plugin token IDs. Token values are never returned.",
    returns: "Array of admin server bindings.",
    source: import.meta.path,
    tag: "public-events",
    requestBody: null,
    responseBody: makeArray(EVENT_ADMIN_SERVER),
    pathParams: null,
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditTokens },
    async handleRequest({ timer }) {
        using _ = timer.create("getAdminPublicEventServers");

        return await getAdminServers();
    },
};
