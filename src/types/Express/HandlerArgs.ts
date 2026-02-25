import type { Request, Response } from "express";
import type { SessionModel } from "@/databases/sessionModel/base/SessionModel";
import type { PluginToken } from "@/shared/types/Common";
import type { User } from "@/shared/types/User";

export interface NoAuthHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams> {
	req: Request<PathParams, ResponseBody, RequestBody, QueryParams, Record<never, never>>;

	res: Response<ResponseBody, Record<never, never>>;
}

export interface TokenOnlyHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
	extends NoAuthHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams> {
	session: SessionModel;
}

export interface UserHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
	extends TokenOnlyHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams> {
	user: User;
}

interface NoUserHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
	extends NoAuthHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams> {
	session: null;

	user: null;
}

export type OptionalUserHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams> =
	| UserHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
	| NoUserHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>;

export interface PluginHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams>
	extends NoAuthHandlerArgs<RequestBody, ResponseBody, PathParams, QueryParams> {
	token: PluginToken;
}
