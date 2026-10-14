import { getPublicCatalog } from "@/services/publicEvents";
import { EVENT_CATALOG } from "@/shared/types/PublicEvents";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { makeArray } from "@/utils/specUtils";

export const getPublicEventCatalog: Endpoint<void, Awaited<ReturnType<typeof getPublicCatalog>>> = {
    method: "get",
    path: "/public-events/catalog",
    auth: AuthScope.None,
    description: "Gets the purchasable event catalog. Commands are never included.",
    returns: "Array of enabled purchasable events.",
    source: import.meta.path,
    requestBody: null,
    responseBody: makeArray(EVENT_CATALOG),
    pathParams: null,
    queryParams: null,
    async handleRequest({ timer }) {
        using _ = timer.create("getPublicEventCatalog");

        return await getPublicCatalog();
    },
};
