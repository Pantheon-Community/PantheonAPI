import type { AuthScope } from "./AuthScope";
import type {
	NoAuthHandlerArgs,
	OptionalUserHandlerArgs,
	PluginHandlerArgs,
	TokenOnlyHandlerArgs,
	UserHandlerArgs,
} from "./HandlerArgs";

interface EndpointProviderBase<
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

type EndpointProviderNoAuth<RequestBody, ResponseBody, PathParams, QueryParams> =
	EndpointProviderBase<
		AuthScope.None,
		RequestBody,
		ResponseBody,
		PathParams,
		QueryParams,
		NoAuthHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
	>;

type EndpointProviderTokenOnly<RequestBody, ResponseBody, PathParams, QueryParams> =
	EndpointProviderBase<
		AuthScope.TokenOnly,
		RequestBody,
		ResponseBody,
		PathParams,
		QueryParams,
		TokenOnlyHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
	>;

type EndpointProviderOptionalUser<RequestBody, ResponseBody, PathParams, QueryParams> =
	EndpointProviderBase<
		AuthScope.OptionalUser,
		RequestBody,
		ResponseBody,
		PathParams,
		QueryParams,
		OptionalUserHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
	>;

type EndpointProviderUser<RequestBody, ResponseBody, PathParams, QueryParams> =
	EndpointProviderBase<
		AuthScope.User,
		RequestBody,
		ResponseBody,
		PathParams,
		QueryParams,
		UserHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
	>;

type EndpointProviderPlugin<RequestBody, ResponseBody, PathParams, QueryParams> =
	EndpointProviderBase<
		AuthScope.Plugin,
		RequestBody,
		ResponseBody,
		PathParams,
		QueryParams,
		PluginHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
	>;

export type EndpointProvider<
	RequestBody = void,
	ResponseBody = void,
	PathParams = unknown,
	QueryParams = unknown,
> =
	| EndpointProviderNoAuth<RequestBody, ResponseBody, PathParams, QueryParams>
	| EndpointProviderTokenOnly<RequestBody, ResponseBody, PathParams, QueryParams>
	| EndpointProviderOptionalUser<RequestBody, ResponseBody, PathParams, QueryParams>
	| EndpointProviderUser<RequestBody, ResponseBody, PathParams, QueryParams>
	| EndpointProviderPlugin<RequestBody, ResponseBody, PathParams, QueryParams>;
