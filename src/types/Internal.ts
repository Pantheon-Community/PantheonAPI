import type { UserSession } from "@/shared/types/UserSession";

export type InternalSession = Pick<UserSession, "id" | "accessToken" | "refreshToken" | "userId">;
