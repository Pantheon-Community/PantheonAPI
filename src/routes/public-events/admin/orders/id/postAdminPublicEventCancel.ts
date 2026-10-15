import { cancelOrder } from "@/services/publicEvents";
import { EVENT_ITEM_ID, EVENT_OK, EVENT_CANCEL } from "@/shared/types/PublicEvents";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";

export const postAdminPublicEventCancel: Endpoint<
    { reason: string },
    { ok: true },
    { id: number }
> = {
    method: "post",
    path: "/public-events/admin/orders/:id/cancel",
    auth: AuthScope.Permission,
    description:
        "Audits and cancels a queued paid order without refund. Previously authorized orders are ineligible.",
    returns: "Acknowledgement.",
    source: import.meta.path,
    flags: EndpointFlags.May404,
    tag: "public-events",
    requestBody: EVENT_CANCEL,
    responseBody: EVENT_OK,
    pathParams: makeParams({ id: EVENT_ITEM_ID }),
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditEconomyRewards },
    async handleRequest({ req, session, timer }) {
        using _ = timer.create("postAdminPublicEventCancel");
        return await cancelOrder(req.params.id, session.userId, req.body.reason);
    },
};
