import { userService } from "@/services/userService";
import { GET_ME_RESPONSE, type GetMeResponse } from "@/shared/types/Responses/GetMeResponse";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";

export const getMe: Endpoint<void, GetMeResponse> = {
    method: "get",
    path: "/users/@me",
    auth: AuthScope.Session,
    description: "Gets information about the current user.",
    returns: "User information.",
    tag: "Users",
    flags: EndpointFlags.MakesSecondaryRequests,
    requestBody: null,
    responseBody: GET_ME_RESPONSE,
    pathParams: null,
    queryParams: null,
    async handleRequest({ timer, fingerprint, session }) {
        return await userService(session.accessToken, fingerprint, timer);
    },
};
