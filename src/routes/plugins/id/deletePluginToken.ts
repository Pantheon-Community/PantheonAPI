import { pg } from "@/global/pg";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { Plugin_TOKEN_ID, type PluginTokenId } from "@/shared/types/PluginToken";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";

export const deletePluginToken: Endpoint<void, void, { id: PluginTokenId }> = {
    method: "delete",
    path: "/plugins/tokens/:id",
    auth: AuthScope.Permission,
    description:
        "Deletes an existing plugin token. This will instantly invalidate it so use with caution!",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent,
    requestBody: null,
    responseBody: null,
    pathParams: makeParams({ id: Plugin_TOKEN_ID }),
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditTokens },
    async handleRequest({ req, timer }) {
        using _ = timer.create("deletePluginToken");

        try {
            // we don't care about return value, since 0 matching rows = already deleted
            await pg`DELETE FROM plugin_tokens WHERE id = ${req.params.id}`;
        } catch (error) {
            throw wrapPgError(error);
        }
    },
};
