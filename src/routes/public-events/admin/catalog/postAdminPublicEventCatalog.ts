import { createCatalogItem } from "@/services/publicEvents";
import type { PublicEventCatalogPayload } from "@/shared/types/PublicEvents";
import { EVENT_ADMIN_CATALOG, EVENT_CATALOG_PAYLOAD } from "@/shared/types/PublicEvents";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";

export const postAdminPublicEventCatalog: Endpoint<
    PublicEventCatalogPayload,
    Awaited<ReturnType<typeof createCatalogItem>>
> = {
    method: "post",
    path: "/public-events/admin/catalog",
    auth: AuthScope.Permission,
    description: "Creates a purchasable event catalog entry.",
    returns: "The created catalog entry.",
    source: import.meta.path,
    flags: EndpointFlags.May404,
    tag: "public-events",
    requestBody: EVENT_CATALOG_PAYLOAD,
    responseBody: EVENT_ADMIN_CATALOG,
    pathParams: null,
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditEconomyRewards },
    async handleRequest({ req, timer }) {
        using _ = timer.create("postAdminPublicEventCatalog");

        const { name, description, image, cost, command, enabled, category } = req.body;

        return await createCatalogItem({
            name,
            description,
            image,
            cost,
            command,
            enabled,
            category,
        });
    },
};
