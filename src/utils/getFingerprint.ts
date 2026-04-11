import { config } from "@/global/config";
import type { Fingerprint } from "@/shared/types/Fingerprint";
import type { Brand } from "@/shared/types/Util";
import type { AnyRequest } from "@/types/Express/AnyRequest";

const { mainWebsiteProxySecret } = config.api;

function getAsString<T extends Brand<string, string>>(
    rawValue: string | undefined,
    maxLength: number,
): T | null {
    return (rawValue?.slice(0, maxLength).trim() as T | undefined) || null;
}

export const getFingerprint: (req: AnyRequest) => Fingerprint =
    mainWebsiteProxySecret !== "" ? getFingerprintExtra : getFingerprintNormal;

function getFingerprintNormal(req: AnyRequest): Fingerprint {
    return {
        ip: getAsString(req.ip, 128),
        userAgent: getAsString(req.get("user-agent"), 128),
        userAgentHint: getAsString(req.get("sec-ch-ua"), 128),
        origin: getAsString(req.get("origin"), 64) || getAsString(req.get("host"), 64),
    };
}

function getFingerprintExtra(req: AnyRequest): Fingerprint {
    const token = req.get("x-pantheonclient-t");

    const normalFingerprint = getFingerprintNormal(req);

    if (token === mainWebsiteProxySecret) {
        const { ip, userAgent, userAgentHint, origin } = normalFingerprint;

        return {
            ip: getAsString(req.get("x-pantheonclient-ip"), 128) || ip,
            userAgent: getAsString(req.get("x-pantheonclient-ua"), 128) || userAgent,
            userAgentHint: getAsString(req.get("x-pantheonclient-sec"), 128) || userAgentHint,
            origin,
        };
    }

    return normalFingerprint;
}
