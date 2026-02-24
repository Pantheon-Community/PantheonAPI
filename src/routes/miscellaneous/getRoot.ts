import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

export const getRoot: EndpointProvider<void, string> = {
	method: "get",
	path: "/",
	auth: AuthScope.None,
	handleRequest({ res }) {
		res.status(200).send(
			`Welcome to the Pantheon Community API, see our <a href="/api-docs">API documentation</a> to get started!`,
		);
	},
};
