import { pg } from "@/global/pg";
import type { DiscordId, RoleId } from "@/shared/types/Common";
import { castNumber } from "@/utils/castNumber";
import { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "../utils/handlePgError";
import type { UserRoleModel } from "./userRoleModel";

interface SelectResult {
    role_id: UserRoleModel["role_id"];
}

export async function getUserRoleIds(userId: DiscordId, timer: ServerTimer): Promise<RoleId[]> {
    using _ = timer.create("getUserRoleIds");

    try {
        const roleIds = await pg<SelectResult[]>`
            SELECT role_id FROM user_roles
            WHERE user_id = ${userId}
        `;

        return roleIds.map((x) => castNumber(x.role_id));
    } catch (error) {
        throw wrapPgError(error);
    }
}
