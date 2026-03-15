import { getUserRoleIds } from "@/databases/userRoles/getUserRoleIds";
import type { RoleId } from "@/shared/types/Common";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const getMeRoles: Endpoint<void, RoleId[]> = {
    method: "get",
    path: "/users/@me/roles",
    auth: AuthScope.Session,
    async handleRequest({ timer, session }) {
        return await getUserRoleIds(session.userId, timer);
    },
};
