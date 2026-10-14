import { reportRound } from "@/services/publicEvents";
import { EVENT_ROUND, EVENT_ROUND_RESULT, EVENT_SERVER_ID } from "@/shared/types/PublicEvents";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { makeParams } from "@/utils/specUtils";

type Params = { serverId: "1" | "2" };

export const postPublicEventRound: Endpoint<
    { instanceId: string; roundId: string; phase: "prepare" | "started" | "ended" },
    Awaited<ReturnType<typeof reportRound>>,
    Params
> = {
    method: "post",
    path: "/public-events/servers/:serverId/round",
    auth: AuthScope.Plugin,
    description:
        "Reports a round phase transition and receives the paid event reservation, if any.",
    returns: "Round number, remaining cooldown, and the current reservation.",
    source: import.meta.path,
    tag: "public-events",
    requestBody: EVENT_ROUND,
    responseBody: EVENT_ROUND_RESULT,
    pathParams: makeParams({ serverId: EVENT_SERVER_ID }),
    queryParams: null,
    async handleRequest({ req, plugin, timer }) {
        using _ = timer.create("postPublicEventRound");

        const { instanceId, roundId, phase } = req.body;

        return await reportRound(req.params.serverId, plugin, instanceId, roundId, phase);
    },
};
