import type { OAS } from "@/shared/global/OAS";
import { SITE_ERROR_OBJECT, type SiteErrorObject } from "@/shared/types/SiteErrorObject";
import { SiteError } from "./SiteError";

interface InternalServerErrorObject extends SiteErrorObject {
    errorId: number;
}

/**
 * Error thrown (in production only) when an unexpected error occurs.
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/500 | MDN Reference}
 */
export class InternalServerError extends SiteError<InternalServerErrorObject> {
    protected override statusCode = 500; // internal server error

    public constructor(errorId: number) {
        super({
            title: "Internal Server Error",
            description: "An unexpected error occurred, please contact NachoToast.",
            errorId,
        });
    }
}

export const INTERNAL_SERVER_ERROR = {
    description:
        "Error thrown (in production only) when an unexpected error occurs.\n\n[MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/500)",
    content: {
        "application/json": {
            schema: {
                ...SITE_ERROR_OBJECT,
                example: {
                    title: "Internal Server Error",
                    description:
                        "Something went wrong with that request, please reach out to a developer.",
                    errorId: 123,
                },
            },
        },
    },
} as const satisfies OAS.Response;
