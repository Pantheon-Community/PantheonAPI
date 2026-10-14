import { heartbeatServer } from "@/services/publicEvents";
import { EVENT_HEARTBEAT, EVENT_OK, EVENT_SERVER_ID } from "@/shared/types/PublicEvents";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { makeParams } from "@/utils/specUtils";

type Params = { serverId: "1" | "2" };

export const postPublicEventHeartbeat: Endpoint<{ instanceId: string }, { ok: true }, Params> = {
    method: "post",
    path: "/public-events/servers/:serverId/heartbeat",
    auth: AuthScope.Plugin,
    description: "Renews the authoritative scheduler instance for a purchased-event server.",
    returns: "Acknowledgement.",
    source: import.meta.path,
    tag: "public-events",
    requestBody: EVENT_HEARTBEAT,
    responseBody: EVENT_OK,
    pathParams: makeParams({ serverId: EVENT_SERVER_ID }),
    queryParams: null,
    async handleRequest({ req, plugin, timer }) {
        using _ = timer.create("postPublicEventHeartbeat");

        return await heartbeatServer(req.params.serverId, plugin, req.body.instanceId);
    },
};
