import type { Fingerprint } from "@/shared/types/Fingerprint";
import type { Brand } from "@/shared/types/Util";
import type { AnyRequest } from "@/types/Express/AnyRequest";

function getAsString<T extends Brand<string, string>>(
    rawValue: string | undefined,
    maxLength: number,
): T | null {
    return (rawValue?.slice(0, maxLength).trim() as T | undefined) || null;
}

export function getFingerprint(req: AnyRequest): Fingerprint {
    return {
        ip: getAsString(req.ip, 128),
        userAgent: getAsString(req.get("user-agent"), 128),
        userAgentHint: getAsString(req.get("sec-ch-ua"), 128),
        origin: getAsString(req.get("origin"), 64) || getAsString(req.get("host"), 64),
    };
}
