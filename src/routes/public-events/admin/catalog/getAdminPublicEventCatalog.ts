import { getAdminCatalog } from "@/services/publicEvents";
import { EVENT_ADMIN_CATALOG } from "@/shared/types/PublicEvents";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { makeArray } from "@/utils/specUtils";

export const getAdminPublicEventCatalog: Endpoint<
    void,
    Awaited<ReturnType<typeof getAdminCatalog>>
> = {
    method: "get",
    path: "/public-events/admin/catalog",
    auth: AuthScope.Permission,
    description: "Gets the purchasable event catalog including commands and enabled state.",
    returns: "Array of catalog entries with their commands.",
    source: import.meta.path,
    tag: "public-events",
    requestBody: null,
    responseBody: makeArray(EVENT_ADMIN_CATALOG),
    pathParams: null,
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditEconomyRewards },
    async handleRequest({ timer }) {
        using _ = timer.create("getAdminPublicEventCatalog");

        return await getAdminCatalog();
    },
};
