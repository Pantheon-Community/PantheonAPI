import type { DiscordId } from "@/shared/types/Common";
import type { RoleId } from "@/shared/types/Role";
import type { SteamId64 } from "@/shared/types/SteamUser";
import type { User, UserBasic } from "@/shared/types/User";
import type { UserSession } from "@/shared/types/UserSession";

export type InternalSession = Pick<UserSession, "id" | "accessToken" | "refreshToken" | "userId">;

export interface UserRole {
    userId: DiscordId;

    roleId: RoleId;
}

export interface SearchedUser
    extends
        UserBasic,
        Pick<
            User,
            "firstSeenAt" | "lastSeenAt" | "lifetimeActionCount" | "ip" | "userAgent" | "origin"
        > {
    steamId: SteamId64 | null;
}
