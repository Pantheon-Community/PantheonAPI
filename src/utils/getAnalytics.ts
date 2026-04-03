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
        ip: getAsString(req.ip, 64),
        userAgent: getAsString(req.get("user-agent"), 255),
        origin: getAsString(req.get("origin"), 64) || getAsString(req.get("host"), 64),
    };
}
