import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";
import type { EconomyReward, EconomyRewardInput, RewardId } from "@/shared/types/EconomyReward";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { sql } from "bun";
import { usersDb, type UserModel } from "./users";
import {
    Database,
    type ExternalReference,
    type InsertPayloadFor,
    type UpdatePayloadFor,
} from "./utils/database";

export interface RewardModel {
    readonly id: string;

    readonly title: string;

    readonly subtitle: string;

    readonly description: string;

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
    "title",
    "subtitle",
    "description",
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
            id: { type: "BIGINT GENERATED ALWAYS AS IDENTITY", extra: ["PRIMARY KEY"] },
            title: { type: "TEXT" },
            subtitle: { type: "TEXT" },
            description: { type: "TEXT" },
            image: { type: "TEXT" },
            cost: { type: "INT" },
            normal_cost: { type: "INT" },
            item_id: { type: "SMALLINT", nullable: true },
            item_count: { type: "SMALLINT" },
            posted_by: {
                type: "TEXT",
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

    public override async setup(): Promise<void> {
        await Promise.all([
            pg`ALTER TABLE ${this.tableName} ADD PRIMARY KEY (id)`.catch(() => null),
            pg`ALTER TABLE ${this.tableName} ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT ''`,
            pg`ALTER TABLE ${this.tableName} ADD COLUMN IF NOT EXISTS subtitle TEXT NOT NULL DEFAULT ''`,
            pg`ALTER TABLE ${this.tableName} ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`,
        ]);

        await super.setup();
    }

    public async getAllRewards(timer: ServerTimer): Promise<EconomyReward[]> {
        using _ = timer.create("getAllRewards");

        const results = await this.selectAll(ALL_KEYS);

        return results.map<EconomyReward>((x) => ({
            id: castNumber(x.id),
            title: x.title,
            subtitle: x.subtitle,
            description: x.description,
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

    public async getSpecificRewards(
        ids: RewardId[],
        timer: ServerTimer,
    ): Promise<Pick<EconomyReward, "id" | "cost">[]> {
        using _ = timer.create("getSpecificRewards");

        const results = await this.selectBy("id", sql`ANY(${sql.array(ids, "BIGINT")})`, [
            "id",
            "cost",
        ]);

        return results.map((x) => ({ id: castNumber(x.id), cost: x.cost }));
    }

    public async createReward(
        input: EconomyRewardInput,
        user: DiscordId,
        timer: ServerTimer,
    ): Promise<RewardId> {
        using _ = timer.create("createReward");

        const insertPayload: InsertPayloadFor<RewardModel, "id"> = {
            title: input.title,
            subtitle: input.subtitle,
            description: input.description,
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
