import type { UserAgent } from "@/shared/types/Common";
import type { AnyRequest } from "@/types/Express/AnyRequest";

export function getUserAgent(req: AnyRequest): UserAgent {
	return (req.headers["user-agent"]?.slice(0, 255) || "unknown") as UserAgent;
}
