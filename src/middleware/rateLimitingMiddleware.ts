import { config } from "@/global/config";
import type { OAS } from "@/shared/global/OAS";
import type { RequestHandler } from "express";
import rateLimit, { type ValueDeterminingMiddleware } from "express-rate-limit";

/**
 * Limits number of requests a user can make to the API in a given time window.
 *
 * @see {@link https://www.npmjs.com/package/express-rate-limit}
 */
export function rateLimitingMiddleware(): RequestHandler {
    return rateLimit({
        windowMs: 60 * 1000, // 1 minute window
        limit: decideLimit(),
        legacyHeaders: false,
        standardHeaders: "draft-8",
    });
}

function decideLimit(): number | ValueDeterminingMiddleware<number> {
    const { maxRequestsPerMinute, mainWebsiteProxySecret } = config.api;

    if (maxRequestsPerMinute === Number.POSITIVE_INFINITY || mainWebsiteProxySecret === "") {
        return maxRequestsPerMinute;
    }

    const increasedQuota = 10 * maxRequestsPerMinute;

    return (req) => {
        const token = req.get("x-pantheonclient-t");

        if (token !== undefined && token === mainWebsiteProxySecret) {
            return increasedQuota;
        }

        return maxRequestsPerMinute;
    };
}

export const RATE_LIMITED_ERROR = {
    description:
        "Too many requests, rate limited.\n\n[IETF Draft 8](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers-08)",
    headers: {
        RateLimit: {
            required: true,
            schema: {
                type: "string",
                example: '"30-in-1min"; r=27; t=54',
            },
            description:
                "- 'r' (remaining) = number of requests you can currently make before getting rate limited.\n- 't' = number of seconds until the next rate limit reset.",
        },
        "RateLimit-Policy": {
            required: true,
            schema: {
                type: "string",
                example: '"30-in-1min"; q=30; w=60;',
            },
            description:
                "- 'q' (quota) = number of requests that can ever be made before getting rate limited.\n- 'w' = number of seconds between rate limit resets.",
        },
    },
} as const satisfies OAS.Response;
