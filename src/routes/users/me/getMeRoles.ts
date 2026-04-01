import { userRolesDb } from "@/databases/userRoles";
import type { RoleId } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Gets all the role IDs of the currently logged-in user. */
export const getMeRoles: Endpoint<void, RoleId[]> = {
    method: "get",
    path: "/users/@me/roles",
    auth: AuthScope.Session,
    async handleRequest({ timer, session }) {
        return await userRolesDb.getUserRoleIds(session.userId, timer);
    },
};
