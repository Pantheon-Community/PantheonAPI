import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";
import { getIp as getIpFunction } from "@/utils/getIp";

export const getIp: EndpointProvider<void, string> = {
	method: "get",
	path: "/ip",
	auth: AuthScope.None,
	handleRequest({ req, res }) {
		res.status(200).send(getIpFunction(req));
	},
};
