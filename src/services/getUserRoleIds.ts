import { pg } from "@/global/pg";
import type { UserRoleModel } from "@/models/UserRoleModel";
import type { DiscordId } from "@/shared/types/Common";
import type { RoleId } from "@/shared/types/Role";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "@/utils/wrapPgError";

export async function getUserRoleIds(userId: DiscordId, timer: ServerTimer): Promise<RoleId[]> {
    using _ = timer.create("getUserRoleIds");

    try {
        const roles = await pg<Pick<UserRoleModel, "role_id">[]>`
            SELECT role_id
            FROM user_roles
            WHERE user_id = ${userId}
        `;

        return roles.map(format);
    } catch (error) {
        throw wrapPgError(error);
    }
}

function format(x: Pick<UserRoleModel, "role_id">): RoleId {
    return castNumber(x.role_id);
}
