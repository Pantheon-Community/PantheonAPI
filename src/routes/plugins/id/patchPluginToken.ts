import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { Plugin_TOKEN_ID, type PluginTokenId } from "@/shared/types/PluginToken";
import {
    PLUGIN_TOKEN_REQUEST,
    type PluginTokenRequest,
} from "@/shared/types/Requests/PluginTokenRequest";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";

export const patchPluginToken: Endpoint<PluginTokenRequest, void, { id: PluginTokenId }> = {
    method: "patch",
    path: "/plugins/tokens/:id",
    auth: AuthScope.Permission,
    description: "Updates the label of an existing plugin token object.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent | EndpointFlags.May404,
    requestBody: PLUGIN_TOKEN_REQUEST,
    responseBody: null,
    pathParams: makeParams({ id: Plugin_TOKEN_ID }),
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditTokens },
    async handleRequest({ req, timer, session }) {
        using _ = timer.create("patchPluginToken");

        const updatedRows = await pg<[]>`
            UPDATE plugin_tokens
            SET
                label = ${req.body.label},
                last_updated_by = ${session.userId},
                last_updated_at = NOW()
            WHERE id = ${req.params.id}
            RETURNING 1
            `;

        if (updatedRows.length < 1) {
            throw new NotFoundError({
                title: "Token Not Found",
                description: "A plugin token with this ID does not exist in the database.",
            });
        }
    },
};
