import type { User } from "@/shared/types/User";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

export const getMe: EndpointProvider<void, User> = {
	method: "get",
	path: "/users/@me",
	auth: AuthScope.User,
	handleRequest({ res, timer, user }) {
		timer.addTo(res);

		res.status(200).json(user);
	},
};
