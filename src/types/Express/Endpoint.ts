import type { AuthScope } from "./AuthScope";
import type {
    NoAuthHandlerArgs,
    OptionalUserHandlerArgs,
    PluginHandlerArgs,
    TokenOnlyHandlerArgs,
    UserHandlerArgs,
} from "./HandlerArgs";

interface EndpointBase<
    Auth extends AuthScope,
    RequestBody,
    ResponseBody,
    PathParams,
    QueryParams,
    HandlerArgs extends NoAuthHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>,
> {
    method: "get" | "post" | "put" | "patch" | "delete";

    path: string;

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
    noUpdateSessions?: true;

    /** Entry point for handling requests. */
    handleRequest({ req, res }: HandlerArgs): Promise<void> | void;
}

type NoAuthEndpoint<RequestBody, ResponseBody, PathParams, QueryParams> = EndpointBase<
    AuthScope.None,
    RequestBody,
    ResponseBody,
    PathParams,
    QueryParams,
    NoAuthHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
>;

type TokenOnlyEndpoint<RequestBody, ResponseBody, PathParams, QueryParams> = EndpointBase<
    AuthScope.TokenOnly,
    RequestBody,
    ResponseBody,
    PathParams,
    QueryParams,
    TokenOnlyHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
>;

type OptionalUserEndpoint<RequestBody, ResponseBody, PathParams, QueryParams> = EndpointBase<
    AuthScope.OptionalUser,
    RequestBody,
    ResponseBody,
    PathParams,
    QueryParams,
    OptionalUserHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
>;

type UserEndpoint<RequestBody, ResponseBody, PathParams, QueryParams> = EndpointBase<
    AuthScope.User,
    RequestBody,
    ResponseBody,
    PathParams,
    QueryParams,
    UserHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
>;

type PluginEndpoint<RequestBody, ResponseBody, PathParams, QueryParams> = EndpointBase<
    AuthScope.Plugin,
    RequestBody,
    ResponseBody,
    PathParams,
    QueryParams,
    PluginHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
>;

export type Endpoint<
    RequestBody = void,
    ResponseBody = void,
    PathParams = unknown,
    QueryParams = unknown,
> =
    | NoAuthEndpoint<RequestBody, ResponseBody, PathParams, QueryParams>
    | TokenOnlyEndpoint<RequestBody, ResponseBody, PathParams, QueryParams>
    | OptionalUserEndpoint<RequestBody, ResponseBody, PathParams, QueryParams>
    | UserEndpoint<RequestBody, ResponseBody, PathParams, QueryParams>
    | PluginEndpoint<RequestBody, ResponseBody, PathParams, QueryParams>;
