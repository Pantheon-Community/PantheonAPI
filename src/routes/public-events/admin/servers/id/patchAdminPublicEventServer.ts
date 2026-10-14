import { updateAdminServer } from "@/services/publicEvents";
import {
    EVENT_ADMIN_SERVER,
    EVENT_SERVER_ID,
    EVENT_SERVER_PATCH,
} from "@/shared/types/PublicEvents";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";

type Params = { serverId: "1" | "2" };

export const patchAdminPublicEventServer: Endpoint<
    { enabled: boolean; pluginTokenId: number | null },
    Awaited<ReturnType<typeof updateAdminServer>>,
    Params
> = {
    method: "patch",
    path: "/public-events/admin/servers/:serverId",
    auth: AuthScope.Permission,
    description: "Enables a purchasable event server and binds it to a plugin token.",
    returns: "The updated admin server binding.",
    source: import.meta.path,
    flags: EndpointFlags.May404,
    tag: "public-events",
    requestBody: EVENT_SERVER_PATCH,
    responseBody: EVENT_ADMIN_SERVER,
    pathParams: makeParams({ serverId: EVENT_SERVER_ID }),
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditTokens },
    async handleRequest({ req, timer }) {
        using _ = timer.create("patchAdminPublicEventServer");

        const { enabled, pluginTokenId } = req.body;

        return await updateAdminServer(req.params.serverId, { enabled, pluginTokenId });
    },
};
