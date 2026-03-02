import { getAllUserSessions } from "@/databases/userSessions/getAllUserSessions";
import { convertToUserSession } from "@/databases/userSessions/model/convertToUserSession";
import type { UserSession } from "@/shared/types/UserSession";
import { AuthScope } from "@/types/Express/AuthScope";
import type { EndpointProvider } from "@/types/Express/EndpointProvider";

export const getMeSessions: EndpointProvider<void, Partial<UserSession>[]> = {
	method: "get",
	path: "/users/@me/sessions",
	auth: AuthScope.TokenOnly,
	async handleRequest({ res, timer, session }) {
		let sessions: Partial<UserSession>[];

		{
			using _ = timer.create(getAllUserSessions);

			const result = await getAllUserSessions(session.user_id);

			sessions = result.map((x) => {
				const { accessToken, refreshToken, ...rest } = convertToUserSession(x);

				return rest;
			});
		}

		timer.addTo(res).status(200).json(sessions);
	},
};
