import type { FlattenedPermissions } from "@/shared/utils/PermissionHelpers";
import type { ServerTimer } from "@/utils/serverTimer";
import type { Request, Response } from "express";
import type { InternalSession } from "../Internal";
import type { RequestAnalytics } from "../RequestAnalytics";

export interface NoAuthHandlerArgs<RequestBody, PathParams, QueryParams> {
    req: Request<PathParams, void, RequestBody, QueryParams>;

    res: Response;

    timer: ServerTimer;
}

export interface SessionAuthHandlerArgs<
    RequestBody,
    PathParams,
    QueryParams,
> extends NoAuthHandlerArgs<RequestBody, PathParams, QueryParams> {
    session: InternalSession;

    analytics: RequestAnalytics;
}

export interface PermissionAuthHandlerArgs<
    RequestBody,
    PathParams,
    QueryParams,
> extends SessionAuthHandlerArgs<RequestBody, PathParams, QueryParams> {
    perms: FlattenedPermissions;
}
