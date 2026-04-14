import { UnauthorizedError } from "@/errors/UnauthorizedError";
import { pg } from "@/global/pg";
import type { PluginTokenModel } from "@/models/PluginTokenModel";
import type { PluginToken, PluginTokenId } from "@/shared/types/PluginToken";
import type { AnyRequest } from "@/types/Express/AnyRequest";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { wrapPgError } from "@/utils/wrapPgError";
import { getTokenRequired } from "./getToken";

export async function verifyPluginToken(
    req: AnyRequest,
    timer: ServerTimer,
): Promise<PluginTokenId> {
    const token = getTokenRequired<PluginToken>(req);

    using _ = timer.create("verifyPluginToken");

    try {
        const [tokenObject] = await pg<Pick<PluginTokenModel, "id">[]>`
            UPDATE plugin_tokens
            SET
               times_used = times_used + 1,
               last_used_at = NOW()
            WHERE token = ${token}
            RETURNING id
        `;

        if (tokenObject === undefined) {
            throw new UnauthorizedError({
                title: "Invalid Token",
                description:
                    "The provided plugin authorisation token was invalid, it may have been rotated.",
            });
        }

        return castNumber(tokenObject.id);
    } catch (error) {
        throw wrapPgError(error);
    }
}
