import type { PermissionsObject } from "@/shared/types/Permissions/PermissionsObject";
import type { SpecObject } from "@/shared/types/Util";
import type { AuthScope } from "./AuthScope";
import type { EndpointFlags } from "./EndpointFlags";
import type {
    NoAuthHandlerArgs,
    PermissionAuthHandlerArgs,
    SessionAuthHandlerArgs,
} from "./HandlerArgs";

interface EndpointBase<Auth extends AuthScope> {
    method: Exclude<RequestInit["method"], undefined>;

    path: `/${string}`;

    auth: Auth;

    description: string;

    returns: string;

    /** Should be `import.meta.path` */
    source: string;

    flags?: EndpointFlags;

    /** By default the first folder name from `routes/` is used. */
    tag?: Lowercase<string>;

    requestBody: SpecObject | null;

    responseBody: SpecObject | null;

    pathParams: SpecObject | null;

    queryParams: SpecObject | null;
}

export interface NoAuthEndpoint<
    RequestBody = any,
    ResponseBody = any,
    PathParams = any,
    QueryParams = any,
> extends EndpointBase<AuthScope.None> {
    handleRequest({
        req,
        res,
        timer,
    }: NoAuthHandlerArgs<RequestBody, PathParams, QueryParams>):
        | Promise<ResponseBody>
        | ResponseBody;
}

export interface SessionAuthEndpoint<
    RequestBody = any,
    ResponseBody = any,
    PathParams = any,
    QueryParams = any,
> extends EndpointBase<AuthScope.Session> {
    handleRequest({
        req,
        res,
        timer,
        fingerprint,
        session,
    }: SessionAuthHandlerArgs<RequestBody, PathParams, QueryParams>):
        | Promise<ResponseBody>
        | ResponseBody;
}

export interface PermissionAuthEndpoint<
    RequestBody = any,
    ResponseBody = any,
    PathParams = any,
    QueryParams = any,
> extends EndpointBase<AuthScope.Permission> {
    permissions: Partial<PermissionsObject>;

    handleRequest({
        req,
        res,
        timer,
        fingerprint,
        session,
        perms,
    }: PermissionAuthHandlerArgs<RequestBody, PathParams, QueryParams>):
        | Promise<ResponseBody>
        | ResponseBody;
}

export type Endpoint<
    RequestBody = void,
    ResponseBody = void,
    PathParams = unknown,
    QueryParams = unknown,
> =
    | NoAuthEndpoint<RequestBody, ResponseBody, PathParams, QueryParams>
    | SessionAuthEndpoint<RequestBody, ResponseBody, PathParams, QueryParams>
    | PermissionAuthEndpoint<RequestBody, ResponseBody, PathParams, QueryParams>;

export type AnyEndpoint = Endpoint<any, any, any, any>;
