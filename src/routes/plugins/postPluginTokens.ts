import { ForbiddenError } from "@/errors/ForbiddenError";
import { pg } from "@/global/pg";
import type { PluginTokenModel } from "@/models/PluginTokenModel";
import { GeneralPermissions } from "@/shared/types/Permissions/GeneralPermissions";
import { type PluginToken } from "@/shared/types/PluginToken";
import {
    PLUGIN_TOKEN_REQUEST,
    type PluginTokenRequest,
} from "@/shared/types/Requests/PluginTokenRequest";
import {
    MAKE_PLUGIN_TOKEN_RESPONSE,
    type PostPluginTokenResponse,
} from "@/shared/types/Responses/MakePluginTokenResponse";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { castNumber } from "@/utils/castNumber";
import { wrapPgError } from "@/utils/wrapPgError";
import { SQL } from "bun";
import { randomBytes } from "node:crypto";

export const postPluginTokens: Endpoint<PluginTokenRequest, PostPluginTokenResponse> = {
    method: "post",
    path: "/plugins/tokens",
    auth: AuthScope.Permission,
    description: "Creates a new plugin token.",
    returns: "The created token.",
    source: import.meta.path,
    requestBody: PLUGIN_TOKEN_REQUEST,
    responseBody: MAKE_PLUGIN_TOKEN_RESPONSE,
    pathParams: null,
    queryParams: null,
    permissions: { generalPermissions: GeneralPermissions.EditTokens },
    async handleRequest({ req, timer, session }) {
        const token = randomBytes(16).toString("hex") as PluginToken;

        const { userId } = session;

        try {
            using _ = timer.create("insert");

            const [createdObject] = await pg<[Pick<PluginTokenModel, "id">]>`
                INSERT INTO plugin_tokens (label, token, created_by, last_updated_by)
                VALUES (${req.body.label}, ${token}, ${userId}, ${userId})
                RETURNING id
            `;

            return { id: castNumber(createdObject.id), token };
        } catch (error) {
            if (error instanceof SQL.PostgresError && error.errno === "23505") {
                // unique violation
                throw new ForbiddenError({
                    title: "Invalid Label",
                    description: "A plugin token with this label already exists.",
                });
            }

            throw wrapPgError(error);
        }
    },
};
