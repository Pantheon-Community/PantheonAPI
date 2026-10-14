import { updateCatalogItem } from "@/services/publicEvents";
import type { PublicEventCatalogPayload } from "@/shared/types/PublicEvents";
import {
    EVENT_ADMIN_CATALOG,
    EVENT_CATALOG_PAYLOAD,
    EVENT_ITEM_ID,
} from "@/shared/types/PublicEvents";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";

type Params = { id: number };

export const patchAdminPublicEventCatalog: Endpoint<
    PublicEventCatalogPayload,
    Awaited<ReturnType<typeof updateCatalogItem>>,
    Params
> = {
    method: "patch",
    path: "/public-events/admin/catalog/:id",
    auth: AuthScope.Permission,
    description:
        "Modifies a purchasable event catalog entry. Paid orders keep their original snapshot.",
    returns: "The updated catalog entry.",
    source: import.meta.path,
    flags: EndpointFlags.May404,
    tag: "public-events",
    requestBody: EVENT_CATALOG_PAYLOAD,
    responseBody: EVENT_ADMIN_CATALOG,
    pathParams: makeParams({ id: EVENT_ITEM_ID }),
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditEconomyRewards },
    async handleRequest({ req, timer }) {
        using _ = timer.create("patchAdminPublicEventCatalog");

        const { name, description, image, cost, command, enabled, category } = req.body;

        return await updateCatalogItem(req.params.id, {
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
