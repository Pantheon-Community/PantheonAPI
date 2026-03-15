import { pg } from "@/global/pg";
import type { Role } from "@/shared/types/Role";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "../utils/handlePgError";
import type { RoleModel } from "./roleModel";

type SelectQuery = Pick<
    RoleModel,
    "id" | "name" | "icon" | "category" | "level" | "p_general" | "p_user"
>;

export async function getAllRoles(timer: ServerTimer): Promise<Role[]> {
    using _ = timer.create("getRoles");

    try {
        const roles = await pg<SelectQuery[]>`
            SELECT id, name, icon, category, level, p_general, p_user FROM roles
        `;

        return roles.map((x) => ({
            id: castNumber(x.id),
            name: x.name,
            icon: x.icon,
            category: x.category,
            level: x.level,
            permissions: {
                generalPermissions: x.p_general,
                userPermissions: x.p_user,
            },
        }));
    } catch (error) {
        throw wrapPgError(error);
    }
}
