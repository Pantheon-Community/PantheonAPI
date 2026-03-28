import { steamUsersDb } from "@/databases/steamUsers";
import { userRolesDb } from "@/databases/userRoles";
import { usersDb } from "@/databases/users";
import type { DiscordId, Ip } from "@/shared/types/Common";
import { UserPermissions } from "@/shared/types/Permissions/UserPermissions";
import type { GetAllUsersRequest } from "@/shared/types/Requests/GetAllUsersRequest";
import type {
    GetAllUsersResponse,
    UserFromGetAll,
} from "@/shared/types/Responses/GetAllUsersResponse";
import type { RoleId } from "@/shared/types/Role";
import { type SteamId64, type SteamUserWithTimes } from "@/shared/types/SteamUser";
import { hasPermission } from "@/shared/utils/PermissionHelpers";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import type { SearchedUser } from "@/types/Internal";
import type { ServerTimer } from "@/utils/serverTimer";

type BuildingFn = (source: SearchedUser, output: UserFromGetAll) => Partial<UserFromGetAll>;

async function addSteamUsers(steamIds: SteamId64[], timer: ServerTimer): Promise<BuildingFn> {
    const steamUsers = await steamUsersDb.getSteamUsersDirect(steamIds, timer);

    const steamUserMap = new Map<SteamId64, SteamUserWithTimes>();

    for (const steamUser of steamUsers) {
        steamUserMap.set(steamUser.id, steamUser);
    }

    return (source, output) => {
        if (source.steamId !== null) {
            const relevantSteamUser = steamUserMap.get(source.steamId);

            if (relevantSteamUser !== undefined) {
                return { steam: relevantSteamUser };
            }
        }

        return output;
    };
}

async function addUserRoleIds(userIds: DiscordId[], timer: ServerTimer): Promise<BuildingFn> {
    const userRoles = await userRolesDb.getAllUserRoleIds(userIds, timer);

    const userRolesMap = new Map<DiscordId, RoleId[]>();

    for (const { userId, roleId } of userRoles) {
        const existing = userRolesMap.get(userId);

        if (existing === undefined) {
            userRolesMap.set(userId, [roleId]);
        } else {
            existing.push(roleId);
        }
    }

    return (source) => {
        return { roleIds: userRolesMap.get(source.id) ?? [] };
    };
}

/** Gets all users, returned data depends on permissions. */
export const getAllUsers: Endpoint<void, GetAllUsersResponse, void, GetAllUsersRequest> = {
    method: "get",
    path: "/users/@all",
    auth: AuthScope.Permission,
    permissions: { userPermissions: UserPermissions.ViewAllUsers },
    async handleRequest({ req, timer, perms }) {
        const {
            page = 0,
            perPage = 20,
            usernameSearch = null,
            orderBy = "id",
            order = "asc",
        } = req.query;

        const buildingFns: BuildingFn[] = [];

        let ipSearch: Ip | null;

        // if can view user sessions, include relevant info in output, and allow ip searching
        if (hasPermission(perms, { userPermissions: UserPermissions.ViewUserSessions })) {
            ipSearch = req.query.ipSearch ?? null;

            buildingFns.push(({ ip, userAgent, origin }) => ({ ip, userAgent, origin }));
        } else {
            ipSearch = null;
        }

        // if can view user analytics, include relevant info in output
        if (hasPermission(perms, { userPermissions: UserPermissions.ViewUserAnalytics })) {
            buildingFns.push(({ firstSeenAt, lastSeenAt, lifetimeActionCount }) => ({
                firstSeenAt,
                lastSeenAt,
                lifetimeActionCount,
            }));
        }

        const { items: users, totalItemCount } = await usersDb.searchUsers({
            page,
            perPage,
            usernameSearch,
            ipSearch,
            orderBy,
            order,
            timer,
        });

        const extraOutputBuilders: Promise<BuildingFn>[] = [];

        const userIds = users.map((x) => x.id);

        if (userIds.length > 0) {
            // always fetch role ids
            extraOutputBuilders.push(addUserRoleIds(userIds, timer));
        }

        if (hasPermission(perms, { userPermissions: UserPermissions.ViewUserConnections })) {
            // if can view user connections, fetch steam users to add to output
            const steamIds = users.map((x) => x.steamId).filter((x) => x !== null);

            if (steamIds.length > 0) {
                extraOutputBuilders.push(addSteamUsers(steamIds, timer));
            }
        }

        buildingFns.push(...(await Promise.all(extraOutputBuilders)));

        return {
            items: users.map<UserFromGetAll>((source) => {
                const output: UserFromGetAll = {
                    id: source.id,
                    username: source.username,
                    avatar: source.avatar,
                    roleIds: [],
                };

                for (const fn of buildingFns) {
                    Object.assign(output, fn(source, output));
                }

                return output;
            }),

            totalItemCount,
        };
    },
};
