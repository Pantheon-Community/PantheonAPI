import { InternalServerError } from "@/errors/InternalServerError";
import { SiteError } from "@/errors/SiteError";
import { config } from "@/global/config";
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

async function recordError(
    error: Error,
    url: string,
    requestBody: string,
    userId: DiscordId | undefined,
): Promise<string> {
    const { name, message, stack, cause } = error;

    const value: Partial<ErrorModel> = {
        name,
        message,
        url,
        request_body: requestBody,
    };

    if (stack) value.stack = stack;
    if (userId !== undefined) value.user_id = userId;
    if (config.commitHash !== null) value.commit = config.commitHash;

    if (cause instanceof Error) {
        const causeObject = await recordError(cause, url, requestBody, userId);
        value.cause = causeObject;
    }

    const [insertedErrorObject] = await pg<[Pick<ErrorModel, "id">]>`
        INSERT INTO errors ${sql(value)}
        RETURNING id
    `;

    return insertedErrorObject.id;
}

export async function handleEndpointError(
    req: Request,
    error: unknown,
    userId?: DiscordId,
): Promise<unknown> {
    if (!shouldRecordError(error)) {
        return error;
    }

    const errorId = await recordError(error, req.url, getRequestBody(req), userId);

    return new InternalServerError(castNumber(errorId), error);
}
