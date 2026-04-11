import { BadRequestError } from "@/errors/BadRequestError";
import { config } from "@/global/config";
import cors, { type CorsOptions } from "cors";
import type { RequestHandler } from "express";

function makeOriginFunction(): CorsOptions["origin"] {
    const { clientUrls } = config.api;

    if (clientUrls.has("*")) {
        // everyone is allowed :)
        return "*";
    }

    return (origin, callback): void => {
        // origin is undefined on non-browser requests (e.g. Insomnia), or just when a browser
        // calls the endpoint directly (in the case of HTTP GET requests)
        if (origin === undefined || clientUrls.has(origin)) {
            callback(null, true);
        } else {
            callback(
                new BadRequestError({
                    title: "Invalid Origin",
                    description: `The origin header of your request ("${origin}") isn't in the approved client URLs list.`,
                }),
            );
        }
    };
}

/**
 * Adds Cross-Origin Resource Sharing (CORS) headers to responses.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS}
 */
export function corsMiddleware(): RequestHandler {
    return cors({
        origin: makeOriginFunction(),
        exposedHeaders: ["RateLimit", "RateLimit-Policy"],
    });
}
