import type { AnyRequest } from "@/types/Express/AnyRequest";

export function getIp(req: AnyRequest): string {
	return req.ip || "unknown";
}
