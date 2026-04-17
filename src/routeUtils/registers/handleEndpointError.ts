import { InternalServerError } from "@/errors/InternalServerError";
import { SiteError } from "@/errors/SiteError";
import { pg } from "@/global/pg";
import type { ErrorModel } from "@/models/ErrorModel";
import type { DiscordId } from "@/shared/types/Common";
import { castNumber } from "@/utils/castNumber";
import { sql } from "bun";
import type { Request } from "express";

function shouldRecordError(error: unknown): error is Error {
    return error instanceof Error && !(error instanceof SiteError);
}

function getRequestBody(req: Request): string {
    if (!req.body) {
        return "";
    }

    try {
        return JSON.stringify(req.body).slice(0, 4096);
    } catch {
        try {
            return String(req.body).slice(0, 4096);
        } catch {
            return "";
        }
    }
}

export async function handleEndpointError(
    req: Request,
    error: unknown,
    userId?: DiscordId,
): Promise<unknown> {
    if (!shouldRecordError(error)) {
        return error;
    }

    const value: Partial<ErrorModel> = {
        name: error.name,
        message: error.message,
        url: req.url,
        request_body: getRequestBody(req),
    };

    if (error.stack) value.stack = error.stack;
    if (userId !== undefined) value.user_id = userId;

    const [insertedErrorObject] = await pg<[Pick<ErrorModel, "id">]>`
            INSERT INTO errors ${sql(value)}
            RETURNING id
        `;

    return new InternalServerError(castNumber(insertedErrorObject.id));
}
