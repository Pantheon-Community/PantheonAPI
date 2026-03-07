import type { UserBasic } from "@/shared/types/User";
import type { UserSession } from "@/shared/types/UserSession";

export type InternalUser = UserBasic;

export type InternalSession = Pick<UserSession, "accessToken" | "refreshToken" | "userId">;
