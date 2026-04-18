import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { PluginTokenModel } from "@/models/PluginTokenModel";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { PLUGIN_TOKEN_OBJECT, type PluginTokenObject } from "@/shared/types/PluginToken";
import {
    CHECK_PLUGIN_TOKEN_REQUEST,
    type CheckPluginTokenRequest,
} from "@/shared/types/Requests/CheckPluginTokenRequest";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { castNumber } from "@/utils/castNumber";

export const postPluginTokensCheck: Endpoint<CheckPluginTokenRequest, PluginTokenObject> = {
    method: "post",
    path: "/plugins/tokens/check",
    auth: AuthScope.Permission,
    description: "Gets information about a given plugin token.",
    returns: "Plugin token information object.",
    source: import.meta.path,
    flags: EndpointFlags.May404,
    requestBody: CHECK_PLUGIN_TOKEN_REQUEST,
    responseBody: PLUGIN_TOKEN_OBJECT,
    pathParams: null,
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditTokens },
    async handleRequest({ req, timer }) {
        using _ = timer.create("postPluginTokensCheck");

        const [token] = await pg<Omit<PluginTokenModel, "token">[]>`
            SELECT
                id,
                label,
                times_used,
                last_used_at,
                created_by,
                created_at,
                last_updated_by,
                last_updated_at
            FROM plugin_tokens
            WHERE token = ${req.body.token}
        `;

        if (token === undefined) {
            throw new NotFoundError({
                title: "Token Not Found",
                description: "The supplied token is not recognised.",
            });
        }

        const {
            id,
            label,
            times_used,
            last_used_at,
            created_by,
            created_at,
            last_updated_by,
            last_updated_at,
        } = token;

        return {
            id: castNumber(id),
            label,
            timesUsed: times_used,
            lastUsedAt: last_used_at.toISOString(),
            createdBy: created_by,
            createdAt: created_at.toISOString(),
            lastUpdatedBy: last_updated_by,
            lastUpdatedAt: last_updated_at.toISOString(),
        };
    },
};
