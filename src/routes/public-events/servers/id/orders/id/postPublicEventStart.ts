import { authorizeStart } from "@/services/publicEvents";
import {
    EVENT_AUTHORIZED,
    EVENT_DELIVERY,
    EVENT_ORDER_ID,
    EVENT_SERVER_ID,
} from "@/shared/types/PublicEvents";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { makeParams } from "@/utils/specUtils";

type Params = { serverId: "1" | "2"; orderId: number };

export const postPublicEventStart: Endpoint<
    { instanceId: string; roundId: string; deliveryId: string },
    { authorized: true },
    Params
> = {
    method: "post",
    path: "/public-events/servers/:serverId/orders/:orderId/start",
    auth: AuthScope.Plugin,
    description: "Requests permission to execute a reserved paid event in the current round.",
    returns: "Authorisation to execute.",
    source: import.meta.path,
    tag: "public-events",
    requestBody: EVENT_DELIVERY,
    responseBody: EVENT_AUTHORIZED,
    pathParams: makeParams({ serverId: EVENT_SERVER_ID, orderId: EVENT_ORDER_ID }),
    queryParams: null,
    async handleRequest({ req, plugin, timer }) {
        using _ = timer.create("postPublicEventStart");

        const { instanceId, roundId, deliveryId } = req.body;

        return await authorizeStart(
            req.params.serverId,
            plugin,
            instanceId,
            req.params.orderId,
            roundId,
            deliveryId,
        );
    },
};
