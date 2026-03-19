import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import type { UserToken } from "@/shared/types/Common";
import type { DiscordUser } from "@/types/Discord";
import type { ServerTimer } from "@/utils/serverTimer";
import { RouteBases } from "discord-api-types/v10";
import { makeElevatedRequestHeaders } from "../utils/makeElevatedRequestHeaders";

export async function fetchMe(token: UserToken, timer: ServerTimer): Promise<DiscordUser> {
    using _ = timer.create("DIS_fetchMe");

    try {
        const response = await fetch(`${RouteBases.api}/users/@me`, {
            headers: makeElevatedRequestHeaders(token),
        });

        if (!response.ok) {
            throw await response.json();
        }

        return (await response.json()) as DiscordUser;
    } catch (error) {
        throw new SecondaryRequestError(
            {
                title: "User Fetch Failure",
                description: "Unable to fetch Discord user info, your access token may be expired.",
            },
            error,
        );
    }
}
