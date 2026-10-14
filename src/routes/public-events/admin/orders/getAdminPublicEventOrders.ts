import { getAdminOrders, type QueueQuery } from "@/services/publicEvents";
import {
    EVENT_ADMIN_ORDERS_RESPONSE,
    EVENT_PAGINATION,
    type PublicEventServerId,
} from "@/shared/types/PublicEvents";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

type Query = { page: number; perPage: number; serverId?: PublicEventServerId };

export const getAdminPublicEventOrders: Endpoint<
    void,
    Awaited<ReturnType<typeof getAdminOrders>>,
    never,
    Query
> = {
    method: "get",
    path: "/public-events/admin/orders",
    auth: AuthScope.Permission,
    description:
        "Gets paid event order history and recovery state, including deliveries and staff audits.",
    returns: "Paginated order history.",
    source: import.meta.path,
    tag: "public-events",
    requestBody: null,
    responseBody: EVENT_ADMIN_ORDERS_RESPONSE,
    pathParams: null,
    queryParams: EVENT_PAGINATION,
    permissions: { generalPermissions: GeneralPermissions.EditEconomyRewards },
    async handleRequest({ req, timer }) {
        using _ = timer.create("getAdminPublicEventOrders");

        const query: QueueQuery = {
            page: req.query.page,
            perPage: req.query.perPage,
            serverId: req.query.serverId ?? null,
        };

        return await getAdminOrders(query);
    },
};
