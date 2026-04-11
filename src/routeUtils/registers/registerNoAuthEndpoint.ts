import type { NoAuthEndpoint } from "@/types/Express/Endpoint";
import type { ServerTimer } from "@/utils/serverTimer";
import type { Request, Response } from "express";
import { registerBaseEndpoint } from "./registerBaseEndpoint";

export function registerNoAuthEndpoint(endpoint: NoAuthEndpoint): void {
    registerBaseEndpoint(endpoint, handler.bind(endpoint));
}

async function handler(
    this: NoAuthEndpoint,
    req: Request,
    res: Response,
    timer: ServerTimer,
): Promise<unknown> {
    return await this.handleRequest({ req, res, timer });
}
