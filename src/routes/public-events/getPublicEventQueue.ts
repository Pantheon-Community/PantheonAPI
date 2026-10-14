import { getPublicQueue, type QueueQuery } from "@/services/publicEvents";
import {
    EVENT_PAGINATION,
    EVENT_QUEUE_RESPONSE,
    type PublicEventServerId,
} from "@/shared/types/PublicEvents";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

type Query = { page: number; perPage: number; serverId?: PublicEventServerId };

export const getPublicEventQueue: Endpoint<
    void,
    Awaited<ReturnType<typeof getPublicQueue>>,
    never,
    Query
> = {
    method: "get",
    path: "/public-events/queue",
    auth: AuthScope.None,
    description: "Gets the shared pending event queue for all buyers, in per-server FIFO order.",
    returns: "Paginated queue of pending events.",
    source: import.meta.path,
    requestBody: null,
    responseBody: EVENT_QUEUE_RESPONSE,
    pathParams: null,
    queryParams: EVENT_PAGINATION,
    async handleRequest({ req, timer }) {
        using _ = timer.create("getPublicEventQueue");

        const query: QueueQuery = {
            page: req.query.page,
            perPage: req.query.perPage,
            serverId: req.query.serverId ?? null,
        };

        return await getPublicQueue(query);
    },
};
