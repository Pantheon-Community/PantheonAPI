import type { Brand } from "@/shared/types/Util";
import type { AnyRequest } from "@/types/Express/AnyRequest";
import type { RequestAnalytics } from "@/types/RequestAnalytics";

function getAsString<T extends Brand<string, string>>(
    rawValue: string | undefined,
    maxLength: number,
): T | null {
    return (rawValue?.slice(0, maxLength).trim() as T | undefined) || null;
}

export function getAnalytics(req: AnyRequest): RequestAnalytics {
    return {
        ip: getAsString(req.ip, 256),
        userAgent: getAsString(req.get("user-agent"), 512),
        origin: getAsString(req.get("origin"), 128) || getAsString(req.get("host"), 128),
    };
}
