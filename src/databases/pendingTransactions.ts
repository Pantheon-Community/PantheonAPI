import { NotFoundError } from "@/errors/NotFoundError";
import type { DiscordId } from "@/shared/types/Common";
import type { EconomyReward } from "@/shared/types/EconomyReward";
import type { EconomyTransaction, TransactionId } from "@/shared/types/EconomyTransaction";
import type { SteamId64 } from "@/shared/types/SteamUser";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { SQL, sql } from "bun";
import { rewardsDb, type RewardModel } from "./rewards";
import { steamUsersDb, type SteamUserModel } from "./steamUsers";
import { usersDb } from "./users";
import { Database, type ExternalReference, type InsertPayloadFor } from "./utils/database";

export interface PendingTransactionModel {
    id: string;

    reward_id: RewardModel["id"];

    cost: number;

    made_at: Date;

    purchaser: SteamUserModel["id"];
}

const ALL_KEYS = [
    "id",
    "reward_id",
    "cost",
    "made_at",
    "purchaser",
] as const satisfies (keyof PendingTransactionModel)[];

class TransactionNotFoundError extends NotFoundError {
    public constructor() {
        super({
            title: "Transaction Not Found",
            description:
                "A pending transaction with this ID does not exist in the database. It may have been deleted or completed.",
        });
    }
}

class PendingTransactionsDatabase extends Database<
    PendingTransactionModel,
    "id",
    "pending_transactions"
> {
    public constructor() {
        super(
            "pending_transactions",
            "id",
            {
                id: { type: "BIGINT GENERATED ALWAYS AS IDENTITY", extra: ["PRIMARY KEY"] },
                reward_id: {
                    type: "BIGINT",
                    references: {
                        db: rewardsDb,
                        key: "id",
                        onDelete: "CASCADE",
                    } satisfies ExternalReference<RewardModel>,
                },
                cost: { type: "INT" },
                made_at: { type: "TIMESTAMP" },
                purchaser: {
                    type: "TEXT",
                    references: {
                        db: steamUsersDb,
                        key: "id",
                        onDelete: "CASCADE",
                    } satisfies ExternalReference<SteamUserModel>,
                },
            },
            { indexes: ["purchaser"] },
        );
    }

    public async getTransactions(id: DiscordId, timer: ServerTimer): Promise<EconomyTransaction[]> {
        using _ = timer.create("getTransactions");

        const results = await Database.joinSimple(
            {
                from: this,
                select: ALL_KEYS,
                join: "purchaser",
            },
            {
                from: usersDb,
                select: [],
                join: "steam_id",
            },
            sql`users.id = ${id}`,
            "inner",
        );

        return results.map<EconomyTransaction>((x) => ({
            id: castNumber(x.pending_transactions_id),
            rewardId: castNumber(x.pending_transactions_reward_id),
            cost: x.pending_transactions_cost,
            madeAt: x.pending_transactions_made_at.toISOString(),
            purchaser: x.pending_transactions_purchaser,
        }));
    }

    public async createTransactions(
        rewards: Pick<EconomyReward, "id" | "cost">[],
        purchaser: SteamId64,
        postgres: SQL,
        timer: ServerTimer,
    ): Promise<void> {
        using _ = timer.create("createTransactions");

        await Promise.all(
            rewards.map(({ id, cost }) => {
                const insertPayload: InsertPayloadFor<PendingTransactionModel, "id"> = {
                    reward_id: id.toString(),
                    cost,
                    made_at: new Date(),
                    purchaser,
                };

                return this.insert(insertPayload, postgres);
            }),
        );
    }

    public async deleteTransaction(
        id: TransactionId,
        postgres: SQL,
        timer: ServerTimer,
    ): Promise<void> {
        using _ = timer.create("deleteTransaction");

        const wasDeleted = await this.delete(id.toString(), postgres);

        if (!wasDeleted) {
            throw new TransactionNotFoundError();
        }
    }
}

export const pendingTransactionsDb = new PendingTransactionsDatabase();
