import { userService } from "@/services/userService";
import { RequestMethod } from "@/shared/types/RequestMethod";
import type { GetMeResponse } from "@/shared/types/Responses/GetMeResponse";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const getMe: Endpoint<void, GetMeResponse> = {
    method: RequestMethod.Get,
    path: "/users/@me",
    auth: AuthScope.Session,
    async handleRequest({ timer, session, analytics }) {
        return await userService(session.accessToken, analytics, timer);
    },
};
