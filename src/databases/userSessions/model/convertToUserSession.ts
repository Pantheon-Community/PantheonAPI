import type { UserSession } from "@/shared/types/UserSession";
import type { UserSessionModel } from "./userSessionsModel";

export function convertToUserSession(model: UserSessionModel): UserSession {
	return {
		accessToken: model.access_token,
		refreshToken: model.refresh_token,
		startedAt: model.started_at.toISOString(),
		expiresAt: model.expires_at.toISOString(),
		timesRefreshed: model.times_refreshed,
		userId: model.user_id,
		ip: model.ip,
		userAgent: model.user_agent,
		actionCount: model.action_count,
		lastActionAt: model.last_action_at.toISOString(),
	};
}
