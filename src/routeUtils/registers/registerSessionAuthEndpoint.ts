import type { SessionAuthEndpoint } from "@/types/Express/Endpoint";
import { getFingerprint } from "@/utils/getFingerprint";
import type { ServerTimer } from "@/utils/serverTimer";
import type { Request, Response } from "express";
import { getCurrentSession } from "../getCurrentSession";
import { getTokenRequired } from "../getToken";
import { registerBaseEndpoint } from "./registerBaseEndpoint";

export function registerSessionAuthEndpoint(endpoint: SessionAuthEndpoint): void {
    registerBaseEndpoint(endpoint, handler.bind(endpoint));
}

async function handler(
    this: SessionAuthEndpoint,
    req: Request,
    res: Response,
    timer: ServerTimer,
): Promise<unknown> {
    const token = getTokenRequired(req);

    const fingerprint = getFingerprint(req);

    const session = await getCurrentSession(token, fingerprint, timer);

    return await this.handleRequest({ req, res, timer, fingerprint, session });
}
