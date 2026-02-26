import type { AnyRequest } from "@/types/Express/AnyRequest";

export function getUserAgent(req: AnyRequest): string {
	return req.headers["user-agent"]?.slice(0, 255) || "unknown";
}
