import type { PluginAuthEndpoint } from "@/types/Express/Endpoint";
import type { ServerTimer } from "@/utils/serverTimer";
import type { Request, Response } from "express";
import { verifyPluginToken } from "../verifyPluginToken";
import { handleEndpointError } from "./handleEndpointError";
import { registerBaseEndpoint } from "./registerBaseEndpoint";

export function registerPluginAuthEndpoint(endpoint: PluginAuthEndpoint): void {
    registerBaseEndpoint(endpoint, handler.bind(endpoint));
}

async function handler(
    this: PluginAuthEndpoint,
    req: Request,
    res: Response,
    timer: ServerTimer,
): Promise<unknown> {
    const plugin = await verifyPluginToken(req, timer);

    try {
        return await this.handleRequest({ req, res, timer, plugin });
    } catch (error) {
        handleEndpointError(req, error);
        throw error;
    }
}
