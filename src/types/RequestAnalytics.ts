import type { Ip, Origin, UserAgent } from "@/shared/types/Common";

export interface RequestAnalytics {
    readonly ip: Ip | null;

    readonly userAgent: UserAgent | null;

    readonly origin: Origin | null;
}
