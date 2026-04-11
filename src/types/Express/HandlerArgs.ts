import type { Fingerprint } from "@/shared/types/Fingerprint";
import type { FlattenedPermissions } from "@/shared/utils/permissions";
import type { ServerTimer } from "@/utils/serverTimer";
import type { Request, Response } from "express";
import type { InternalSession } from "../Internal";

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

    fingerprint: Fingerprint;
}

export interface PermissionAuthHandlerArgs<
    RequestBody,
    PathParams,
    QueryParams,
> extends SessionAuthHandlerArgs<RequestBody, PathParams, QueryParams> {
    perms: FlattenedPermissions;
}
