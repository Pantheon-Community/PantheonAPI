import { config } from "@/global/config";
import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";

/**
 * Limits number of requests a user can make to the API in a given time window.
 *
 * @see {@link https://www.npmjs.com/package/express-rate-limit}
 */
export function rateLimitingMiddleware(): RequestHandler {
    return rateLimit({
        windowMs: 60 * 1000, // 1 minute window
        limit: config.api.maxRequestsPerMinute,
        legacyHeaders: false,
        standardHeaders: "draft-8",
    });
}
