import { steamUsersDb } from "@/databases/steamUsers";
import { userRolesDb } from "@/databases/userRoles";
import { usersDb } from "@/databases/users";
import type { DiscordId } from "@/shared/types/Common";
import { UserPermissions } from "@/shared/types/Permissions/UserPermissions";
import type { UserFromGetAll } from "@/shared/types/Responses/GetAllUsersResponse";
import { hasPermission } from "@/shared/utils/PermissionHelpers";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

/** Gets a user, returned data depends on permissions. */
export const getUser: Endpoint<void, UserFromGetAll, { id: DiscordId }> = {
    method: "get",
    path: "/users/:id",
    auth: AuthScope.Permission,
    permissions: {},
    async handleRequest({ req, timer, perms }) {
        const [user, roleIds] = await Promise.all([
            usersDb.getUser(req.params.id, timer),
            userRolesDb.getUserRoleIds(req.params.id, timer),
        ]);

        const output: UserFromGetAll = {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            roleIds,
        };

        if (hasPermission(perms, { userPermissions: UserPermissions.ViewAnalytics })) {
            const { firstSeenAt, lastSeenAt, lifetimeActionCount } = user;

            Object.assign(output, {
                firstSeenAt,
                lastSeenAt,
                lifetimeActionCount,
            } satisfies Partial<UserFromGetAll>);
        }

        if (hasPermission(perms, { userPermissions: UserPermissions.ViewSessions })) {
            const { ip, userAgent, origin } = user;

            Object.assign(output, { ip, userAgent, origin } satisfies Partial<UserFromGetAll>);
        }

        if (
            user.steamId !== null &&
            hasPermission(perms, { userPermissions: UserPermissions.ViewConnections })
        ) {
            const [steam] = await steamUsersDb.getSteamUsersDirect([user.steamId], timer);

            if (steam !== undefined) {
                Object.assign(user, { steam } satisfies Partial<UserFromGetAll>);
            }
        }

        return output;
    },
};
