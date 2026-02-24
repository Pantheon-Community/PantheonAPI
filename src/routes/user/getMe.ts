import type { User } from "@/shared/User";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

export const getMe: EndpointProvider<void, User> = {
	method: "get",
	path: "/users/@me",
	auth: AuthScope.User,
	handleRequest({ res, user }) {
		res.status(200).json(user);
	},
};
