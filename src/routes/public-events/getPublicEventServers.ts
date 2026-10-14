import { getPublicServers } from "@/services/publicEvents";
import { EVENT_PUBLIC_SERVER } from "@/shared/types/PublicEvents";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { makeArray } from "@/utils/specUtils";

export const getPublicEventServers: Endpoint<void, Awaited<ReturnType<typeof getPublicServers>>> = {
    method: "get",
    path: "/public-events/servers",
    auth: AuthScope.None,
    description:
        "Gets the servers that accept purchased events, with queue depth and cooldown state.",
    returns: "Array of purchasable event servers.",
    source: import.meta.path,
    requestBody: null,
    responseBody: makeArray(EVENT_PUBLIC_SERVER),
    pathParams: null,
    queryParams: null,
    async handleRequest({ timer }) {
        using _ = timer.create("getPublicEventServers");

        return await getPublicServers();
    },
};
