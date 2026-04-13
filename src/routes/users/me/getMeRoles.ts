import { getUserRoleIds } from "@/services/getUserRoleIds";
import { ROLE_ID, type RoleId } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { makeArray } from "@/utils/specUtils";

export const getMeRoles: Endpoint<void, RoleId[]> = {
    method: "get",
    path: "/users/@me/roles",
    auth: AuthScope.Session,
    description: "Gets all the role IDs of the current user.",
    returns: "Array of role IDs.",
    source: import.meta.path,
    tag: "roles",
    requestBody: null,
    responseBody: makeArray(ROLE_ID),
    pathParams: null,
    queryParams: null,
    async handleRequest({ timer, session }) {
        return await getUserRoleIds(session.userId, timer);
    },
};
