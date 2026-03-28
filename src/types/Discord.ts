import type { DiscordId } from "@/shared/types/Common";
import type { SteamId64 } from "@/shared/types/SteamUser";
import type { UserSession } from "@/shared/types/UserSession";
import type { APIUser } from "discord-api-types/v10";

export interface DiscordAuthData extends Pick<UserSession, "accessToken" | "refreshToken"> {
    expiresAt: Date;
}

export interface DiscordUser extends Pick<APIUser, "username" | "global_name" | "avatar"> {
    id: DiscordId;
}

export interface DiscordSteamConnection {
    readonly id: SteamId64;

    readonly username: string;
}
