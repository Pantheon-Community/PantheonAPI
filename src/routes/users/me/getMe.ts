import { userService } from "@/services/userService";
import type { GetMeResponse } from "@/shared/types/Responses/GetMeResponse";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Gets information about the currently logged-in user. */
export const getMe: Endpoint<void, GetMeResponse> = {
    method: "get",
    path: "/users/@me",
    auth: AuthScope.Session,
    async handleRequest({ timer, session, analytics }) {
        return await userService(session.accessToken, analytics, timer);
    },
};
