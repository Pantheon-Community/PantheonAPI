import { pg } from "@/global/pg";
import type { PluginTokenModel } from "@/models/PluginTokenModel";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { PLUGIN_TOKEN_OBJECT, type PluginTokenObject } from "@/shared/types/PluginToken";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { castNumber } from "@/utils/castNumber";
import { makeArray } from "@/utils/specUtils";
import { wrapPgError } from "@/utils/wrapPgError";

export const getPluginTokens: Endpoint<void, PluginTokenObject[]> = {
    method: "get",
    path: "/plugins/tokens",
    auth: AuthScope.Permission,
    description: "Gets information about all currently active plugin tokens.",
    returns: "Array of plugin token information objects.",
    source: import.meta.path,
    requestBody: null,
    responseBody: makeArray(PLUGIN_TOKEN_OBJECT),
    pathParams: null,
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditTokens },
    async handleRequest({ timer }) {
        using _ = timer.create("getPluginTokens");

        try {
            const tokens = await pg<Result[]>`
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
            `;

            return tokens.map(format);
        } catch (error) {
            throw wrapPgError(error);
        }
    },
};

type Result = Omit<PluginTokenModel, "token">;

function format(x: Result): PluginTokenObject {
    const {
        id,
        label,
        times_used,
        last_used_at,
        created_by,
        created_at,
        last_updated_by,
        last_updated_at,
    } = x;

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
}
