import type { Ip } from "@/shared/types/Common";
import type { AnyRequest } from "@/types/Express/AnyRequest";

export function getIp(req: AnyRequest): Ip {
	return (req.ip?.slice(0, 64) || "unknown") as Ip;
}
