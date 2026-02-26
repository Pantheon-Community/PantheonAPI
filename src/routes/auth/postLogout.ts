import { deleteSession } from "@/databases/sessionModel/deleteSession";
import { revokeAccessToken } from "@/discord/revokeAccessToken";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

export const postLogout: EndpointProvider = {
	method: "post",
	path: "/logout",
	auth: AuthScope.TokenOnly,
	async handleRequest({ res, timer, session }) {
		await Promise.all([
			revokeAccessToken(session.access_token),
			deleteSession(session.access_token),
		]);

		timer.finished(revokeAccessToken, deleteSession);

		timer.addTo(res);

		res.sendStatus(200);
	},
};
