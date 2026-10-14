import type { OAS } from "@/shared/global/OAS";
import { SITE_ERROR_OBJECT } from "@/shared/types/SiteErrorObject";
import { SiteError } from "./SiteError";

/** A required trusted datasource is temporarily unavailable. */
export class ServiceUnavailableError extends SiteError {
    protected override statusCode = 503;
}

export const SERVICE_UNAVAILABLE_ERROR = {
    description:
        "A required trusted datasource is unavailable. Retry later; no purchase was charged.",
    content: { "application/json": { schema: SITE_ERROR_OBJECT } },
} as const satisfies OAS.Response;
