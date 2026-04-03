import { NotFoundError } from "@/errors/NotFoundError";
import type { DiscordId } from "@/shared/types/Common";
import type { EconomyReward, EconomyRewardInput, RewardId } from "@/shared/types/EconomyReward";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { usersDb, type UserModel } from "./users";
import { Column } from "./utils/column";
import {
    Database,
    type ExternalReference,
    type InsertPayloadFor,
    type UpdatePayloadFor,
} from "./utils/database";

export interface RewardModel {
    readonly id: string;

    readonly image: string;

    readonly cost: number;

    readonly normal_cost: number;

    readonly item_id?: number;

    readonly item_count: number;

    readonly posted_by?: UserModel["id"];

    readonly posted_at: Date;

    readonly last_updated_at: Date;
}

const ALL_KEYS = [
    "id",
    "image",
    "cost",
    "normal_cost",
    "item_id",
    "item_count",
    "posted_by",
    "posted_at",
    "last_updated_at",
] as const satisfies (keyof RewardModel)[];

class RewardNotFoundError extends NotFoundError {
    public constructor() {
        super({
            title: "Reward Not Found",
            description:
                "An ecomomy reward with this ID does not exist in the database. It may have been deleted.",
        });
    }
}

class RewardsDatabase extends Database<RewardModel, "id", "economy_rewards"> {
    public constructor() {
        super("economy_rewards", "id", {
            id: { type: "BIGINT GENERATED ALWAYS AS IDENTITY" },
            image: { type: "VARCHAR(64)" },
            cost: { type: "INT" },
            normal_cost: { type: "INT" },
            item_id: { type: "SMALLINT", nullable: true },
            item_count: { type: "SMALLINT" },
            posted_by: {
                type: Column.Snowflake,
                nullable: true,
                references: {
                    db: usersDb,
                    key: "id",
                    onDelete: "SET NULL",
                } satisfies ExternalReference<UserModel>,
            },
            posted_at: { type: "TIMESTAMP" },
            last_updated_at: { type: "TIMESTAMP" },
        });
    }

    public async getAllRewards(timer: ServerTimer): Promise<EconomyReward[]> {
        using _ = timer.create("getAllRewards");

        const results = await this.selectAll(ALL_KEYS);

        return results.map<EconomyReward>((x) => ({
            id: castNumber(x.id),
            image: x.image,
            cost: x.cost,
            normalCost: x.normal_cost,
            itemId: x.item_id ?? null,
            itemCount: x.item_count,
            postedBy: x.posted_by ?? null,
            postedAt: x.posted_at.toISOString(),
            lastUpdatedAt: x.last_updated_at.toISOString(),
        }));
    }

    public async createReward(
        input: EconomyRewardInput,
        user: DiscordId,
        timer: ServerTimer,
    ): Promise<RewardId> {
        using _ = timer.create("createReward");

        const insertPayload: InsertPayloadFor<RewardModel, "id"> = {
            image: input.image,
            cost: input.cost,
            normal_cost: input.normalCost,
            item_count: input.itemCount,
            posted_by: user,
            posted_at: new Date(),
            last_updated_at: new Date(),
        };

        if (input.itemId !== null) insertPayload.item_id = input.itemId;

        const createdRewardId = await this.insert(insertPayload);

        return castNumber(createdRewardId);
    }

    public async deleteReward(id: RewardId, timer: ServerTimer): Promise<void> {
        using _ = timer.create("deleteReward");

        const wasDeleted = await this.delete(id.toString());

        if (!wasDeleted) {
            throw new RewardNotFoundError();
        }
    }

    public async updateReward(
        id: RewardId,
        input: EconomyRewardInput,
        timer: ServerTimer,
    ): Promise<void> {
        using _ = timer.create("updateReward");

        const updatePayload: UpdatePayloadFor<RewardModel, "id"> = {
            image: input.image,
            cost: input.cost,
            normal_cost: input.normalCost,
            item_id: input.itemId,
            item_count: input.itemCount,
            last_updated_at: new Date(),
        };

        const updatedRewardId = await this.update(id.toString(), updatePayload);

        if (updatedRewardId === undefined) {
            throw new RewardNotFoundError();
        }
    }
}

export const rewardsDb = new RewardsDatabase();
