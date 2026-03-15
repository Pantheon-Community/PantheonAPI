import type { PermissionsObject } from "@/shared/types/Permissions/PermissionsObject";
import type { RequestMethod } from "../RequestMethod";
import type { AuthScope } from "./AuthScope";
import type {
    NoAuthHandlerArgs,
    PermissionAuthHandlerArgs,
    SessionAuthHandlerArgs,
} from "./HandlerArgs";

interface EndpointBase<Auth extends AuthScope> {
    method: RequestMethod;

    path: `/${string}`;

    auth: Auth;

    /**
     * If `true`, background updates to the relevant user session will not be triggered when this
     * endpoint is called.
     *
     * Only relevant for the {@link AuthScope.TokenOnly TokenOnly},
     * {@link AuthScope.OptionalUser OptionalUser}, and {@link AuthScope.User User} auth scopes.
     *
     * This is needed if the endpoint modifies or deletes the user session (such as refreshing or
     * logging out), which could conflict with background updates to it.
     */
    // noUpdateSessions?: true;
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
    /**
     * If this endpoint deletes the user's current session, this should be set to `true` to prevent
     * background session updates failing.
     *
     * This is exclusively used by the `/refresh` and `/logout` endpoints.
     */
    skipSessionUpdates?: boolean;

    handleRequest({
        req,
        res,
        timer,
        session,
        analytics,
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
        session,
        analytics,
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
