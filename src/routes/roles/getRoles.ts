import { pg } from "@/global/pg";
import type { RoleModel } from "@/models/RoleModel";
import { ROLE, type Role } from "@/shared/types/Role";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { castNumber } from "@/utils/castNumber";
import { makeArray } from "@/utils/specUtils";

export const getRoles: Endpoint<void, Role[]> = {
    method: "get",
    path: "/roles",
    auth: AuthScope.None,
    description: "Gets all roles.",
    returns: "Array of roles.",
    source: import.meta.path,
    requestBody: null,
    responseBody: makeArray(ROLE),
    pathParams: null,
    queryParams: null,
    async handleRequest({ timer }) {
        using _ = timer.create("getRoles");

        const roles = await pg<RoleModel[]>`SELECT * FROM roles ORDER BY id`;

        return roles.map(format);
    },
};

function format(x: RoleModel): Role {
    return {
        id: castNumber(x.id),
        name: x.name,
        icon: x.icon,
        category: x.category,
        level: x.level,
        permissions: {
            generalPermissions: x.p_general,
            userPermissions: x.p_user,
        },
        createdBy: x.created_by,
        createdAt: x.created_at.toISOString(),
        lastUpdatedBy: x.last_updated_by,
        lastUpdatedAt: x.last_updated_at.toISOString(),
    };
}
