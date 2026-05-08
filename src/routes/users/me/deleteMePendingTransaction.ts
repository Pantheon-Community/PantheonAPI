import { ForbiddenError } from "@/errors/ForbiddenError";
import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { PendingTransactionModel } from "@/models/PendingTransactionModel";
import type { UserModel } from "@/models/UserModel";
import { ECONOMY_REWARD_ID, type EconomyRewardId } from "@/shared/types/EconomyReward";
import type { SteamId64 } from "@/shared/types/SteamUser";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { EndpointFlags } from "@/types/Express/EndpointFlags";
import { makeParams } from "@/utils/specUtils";

export const deleteMePendingTransaction: Endpoint<void, void, { id: EconomyRewardId }> = {
    method: "delete",
    path: "/users/@me/pending-transactions/:id",
    auth: AuthScope.Session,
    description: "Refuns a pending transaction.",
    returns: "Success, no content.",
    source: import.meta.path,
    flags: EndpointFlags.NoContent | EndpointFlags.May404,
    tag: "economy",
    requestBody: null,
    responseBody: null,
    pathParams: makeParams({ id: ECONOMY_REWARD_ID }),
    queryParams: null,
    async handleRequest({ req, timer, session }) {
        let steamId: SteamId64 | null;

        {
            using _ = timer.create("getSteamId");

            const [user] = await pg<Pick<UserModel, "steam_id">[]>`
                SELECT steam_id
                FROM users
                WHERE id = ${session.userId}
            `;

            if (user === undefined) {
                throw new NotFoundError({
                    title: "User Not Found",
                    description:
                        "Could not find you in the database, your account may have been deleted.",
                });
            }
            steamId = user.steam_id;
        }

        if (steamId === null) {
            throw new ForbiddenError({
                title: "No Steam Connection",
                description:
                    "You must link a Steam account to your Discord in order to refund transactions.",
            });
        }

        using _ = timer.create("deleteTransaction");

        const [deletedTransaction] = await pg<Pick<PendingTransactionModel, "cost">[]>`
                DELETE FROM pending_transactions
                WHERE id = ${req.params.id} AND purchaser_id = ${steamId}
                RETURNING cost
            `;

        if (deletedTransaction === undefined) {
            throw new NotFoundError({
                title: "Transaction Not Found",
                description:
                    "A pending transaction with this ID does not exist in the database, it may have already been completed.",
            });
        }
    },
};
