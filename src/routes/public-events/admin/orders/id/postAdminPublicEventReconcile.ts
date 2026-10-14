import { reconcileOrder } from "@/services/publicEvents";
import { EVENT_ITEM_ID, EVENT_OK, EVENT_RECONCILE } from "@/shared/types/PublicEvents";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";

type Params = { id: number };

export const postAdminPublicEventReconcile: Endpoint<
    { outcome: "started" | "retry"; reason: string },
    { ok: true },
    Params
> = {
    method: "post",
    path: "/public-events/admin/orders/:id/reconcile",
    auth: AuthScope.Permission,
    description:
        "Resolves a stuck paid event order. 'started' confirms it ran; 'retry' returns it to the queue.",
    returns: "Acknowledgement.",
    source: import.meta.path,
    flags: EndpointFlags.May404,
    tag: "public-events",
    requestBody: EVENT_RECONCILE,
    responseBody: EVENT_OK,
    pathParams: makeParams({ id: EVENT_ITEM_ID }),
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditEconomyRewards },
    async handleRequest({ req, session, timer }) {
        using _ = timer.create("postAdminPublicEventReconcile");

        return await reconcileOrder(
            req.params.id,
            session.userId,
            req.body.outcome,
            req.body.reason,
        );
    },
};
