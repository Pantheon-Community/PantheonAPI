import { purchasePublicEvent } from "@/services/publicEvents";
import type { PublicEventPurchase, PublicEventPurchaseResult } from "@/shared/types/PublicEvents";
import { EVENT_PURCHASE, EVENT_PURCHASE_RESULT } from "@/shared/types/PublicEvents";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";

export const postMePublicEvents: Endpoint<PublicEventPurchase, PublicEventPurchaseResult> = {
    method: "post",
    path: "/users/@me/public-events",
    auth: AuthScope.Session,
    description:
        "Buys an event (donators or Bots staff) or modifier (everyone) with credits. Event access verification failures return 503; existing paid request retries do not recheck roles.",
    returns: "Order ID, the resulting balance, and the server's pending count.",
    source: import.meta.path,
    flags: EndpointFlags.May403 | EndpointFlags.May404 | EndpointFlags.May503,
    tag: "public-events",
    requestBody: EVENT_PURCHASE,
    responseBody: EVENT_PURCHASE_RESULT,
    pathParams: null,
    queryParams: null,
    async handleRequest({ req, session, timer }) {
        using _ = timer.create("postMePublicEvents");

        const { eventId, serverId, expectedPrice, requestId } = req.body;

        return await purchasePublicEvent({
            buyerId: session.userId,
            eventId,
            serverId,
            expectedPrice,
            requestId,
        });
    },
};
