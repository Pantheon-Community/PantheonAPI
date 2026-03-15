import { getAllRoles } from "@/databases/roles/getAllRoles";
import type { Role } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

export const getRoles: Endpoint<void, Role[]> = {
    method: "get",
    path: "/roles",
    auth: AuthScope.None,
    async handleRequest({ timer }) {
        return await getAllRoles(timer);
    },
};
