import type { UserAnalytics } from "@/shared/types/UserAnalytics";
import type { UserAnalyticsModel } from "./userAnalyticsModel";

export function convertToUserAnalytics(model: UserAnalyticsModel): UserAnalytics {
	return {
		id: model.id,
		firstSeenAt: model.first_seen_at.toISOString(),
		lastSeenAt: model.last_seen_at.toISOString(),
		ip: model.ip,
		userAgent: model.user_agent,
		lifetimeActionCount: model.lifetime_action_count,
	};
}
