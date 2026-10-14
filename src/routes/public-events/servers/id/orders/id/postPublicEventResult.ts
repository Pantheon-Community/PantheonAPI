import { recordResult } from "@/services/publicEvents";
import {
    EVENT_OK,
    EVENT_ORDER_ID,
    EVENT_RESULT,
    EVENT_SERVER_ID,
} from "@/shared/types/PublicEvents";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { makeParams } from "@/utils/specUtils";

type Params = { serverId: "1" | "2"; orderId: number };

export const postPublicEventResult: Endpoint<
    {
        instanceId: string;
        roundId: string;
        deliveryId: string;
        outcome: "started" | "deferred" | "uncertain";
        message: string;
    },
    { ok: true },
    Params
> = {
    method: "post",
    path: "/public-events/servers/:serverId/orders/:orderId/result",
    auth: AuthScope.Plugin,
    description: "Reports the outcome of a paid event attempt. Idempotent for identical retries.",
    returns: "Acknowledgement.",
    source: import.meta.path,
    tag: "public-events",
    requestBody: EVENT_RESULT,
    responseBody: EVENT_OK,
    pathParams: makeParams({ serverId: EVENT_SERVER_ID, orderId: EVENT_ORDER_ID }),
    queryParams: null,
    async handleRequest({ req, plugin, timer }) {
        using _ = timer.create("postPublicEventResult");

        const { instanceId, roundId, deliveryId, outcome, message } = req.body;

        return await recordResult(
            req.params.serverId,
            plugin,
            instanceId,
            req.params.orderId,
            roundId,
            deliveryId,
            outcome,
            message,
        );
    },
};
