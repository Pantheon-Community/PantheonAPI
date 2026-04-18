import { pg } from "@/global/pg";
import type { UserRoleModel } from "@/models/UserRoleModel";
import type { DiscordId } from "@/shared/types/Common";
import type { RoleId } from "@/shared/types/Role";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";

export async function getUserRoleIds(userId: DiscordId, timer: ServerTimer): Promise<RoleId[]> {
    using _ = timer.create("getUserRoleIds");

    const roles = await pg<Pick<UserRoleModel, "role_id">[]>`
        SELECT role_id
        FROM user_roles
        WHERE user_id = ${userId}
        ORDER BY role_id
    `;

    return roles.map((x) => castNumber(x.role_id));
}
