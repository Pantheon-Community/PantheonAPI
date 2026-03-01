import { deleteUserSession } from "@/databases/userSessions/deleteUserSession";
import { revokeAccessToken } from "@/discord/auth/revokeAccessToken";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

export const postLogout: EndpointProvider = {
	method: "post",
	path: "/logout",
	auth: AuthScope.TokenOnly,
	noUpdateSessions: true,
	async handleRequest({ res, timer, session }) {
		// while there's nothing strictly stoppping these functions being executed in parallel via
		// Promise.all(...), if something were to go wrong with access token revocation it would be
		// best not to delete it from the database

		{
			using _ = timer.create(revokeAccessToken);

			await revokeAccessToken(session.access_token);
		}

		{
			using _ = timer.create(deleteUserSession);

			await deleteUserSession(session.access_token);
		}

		timer.addTo(res).sendStatus(200);
	},
};
