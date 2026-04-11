import type { UserSession } from "@/shared/types/UserSession";

export type InternalSession = Pick<UserSession, "id" | "userId" | "accessToken" | "refreshToken">;
