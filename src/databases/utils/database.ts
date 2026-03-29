import { pg } from "@/global/pg";
import type { WithPagination } from "@/shared/types/Pagination";
import type { Brand } from "@/shared/types/Util";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log } from "@/utils/logging";
import { SQL, sql } from "bun";
import type { Prettify } from "../../types/Prettify";
import { wrapPgError } from "../utils/handlePgError";

/**
 * Original model but:
 *
 * - All fields are mutable.
 * - The primary identifying field (usually `id`) is optional.
 */
export type InsertPayloadFor<T, PrimaryKey extends keyof T> = Prettify<
    Pick<Partial<{ -readonly [K in keyof T]: T[K] }>, PrimaryKey> &
        Omit<{ -readonly [K in keyof T]: T[K] }, PrimaryKey>
>;

/**
 * Original model but:
 *
 * - All fields can be omitted.
 * - Optional fields can be set to null.
 * - All fields are mutable.
 * - The primary identifying field (usually `id`) cannot be changed.
 */
export type UpdatePayloadFor<T, PrimaryKey extends keyof T> = Prettify<
    Omit<
        Partial<{ -readonly [K in keyof T]?: undefined extends T[K] ? T[K] | null : T[K] }>,
        PrimaryKey
    >
>;

/** Underlying PostgreSQL column type for a JavaScript type. */
type ColumnType<T> =
    T extends Brand<number, infer _>
        ? ColumnType<number>
        : T extends Brand<string, infer _>
          ? ColumnType<string>
          : T extends string
            ? `VARCHAR(${number})` | `BIGINT GENERATED ALWAYS AS IDENTITY` | "BIGINT"
            : T extends number
              ? `INT` | `SMALLINT`
              : T extends Date
                ? `TIMESTAMP`
                : never;

type ColumnExtra = "PRIMARY KEY" | "UNIQUE";

export interface ExternalReference<T = any> {
    db: Database<T, any, string>;

    key: keyof T;

    onDelete: "CASCADE" | "SET NULL";
}

/**
 * Information about a column.
 *
 * If the column represents an optional object key, it must have the `nullable` field.
 */
type ColumnDef<T, K extends keyof T> = {
    type: ColumnType<T[K]>;

    extra?: ColumnExtra[];

    references?: ExternalReference;
} & (undefined | T[K] extends T[K] ? { nullable: true } : { nullable?: never });

type TableColumns<T> = { [K in keyof T]: ColumnDef<T, K> };

interface TableExtra<T> {
    constraints?: string[];

    indexes?: (keyof T)[];
}

interface JoinParams<MainModel, OtherModel> {
    joinOn: SQL.Query<MainModel | OtherModel>;

    where: SQL.Query<MainModel | OtherModel>;
}

interface JoinSource<Model, Name extends string, Keys extends keyof Model> {
    from: Database<Model, any, Name>;

    select: Keys[];
}

interface SimpleJoinSource<Model, Name extends string, Keys extends keyof Model> extends JoinSource<
    Model,
    Name,
    Keys
> {
    join: keyof Model;
}

type Namespaced<
    Model,
    TableName extends string,
    Keys extends keyof Model,
    Outer extends boolean,
> = {
    [K in Keys as `${TableName}_${K extends string ? K : never}`]: Outer extends true
        ? Model[K] | null
        : Model[K];
};

type Joined<
    ModelA,
    TableNameA extends string,
    KeysA extends keyof ModelA,
    ModelB,
    TableNameB extends string,
    KeysB extends keyof ModelB,
    Outer extends boolean,
> = Namespaced<ModelA, TableNameA, KeysA, false> & Namespaced<ModelB, TableNameB, KeysB, Outer>;

// database database just living in the database wow wow
export abstract class Database<T, PrimaryKey extends keyof T, Name extends string> {
    private readonly tableNameText: Name;
    private readonly primaryKeyText: PrimaryKey;

    protected readonly tableName: SQL.Query<unknown>;
    private readonly primaryKey: SQL.Helper<PrimaryKey>;

    private readonly columns: TableColumns<T>;
    private readonly tableExtra: TableExtra<T> | undefined;

    protected constructor(
        tableName: Name,
        primaryKey: PrimaryKey,
        columns: TableColumns<T>,
        extra?: TableExtra<T>,
    ) {
        this.tableNameText = tableName;
        this.primaryKeyText = primaryKey;

        this.tableName = sql(tableName);
        this.primaryKey = sql(primaryKey);

        this.columns = columns;
        this.tableExtra = extra;
    }

    public async setup(): Promise<void> {
        const body: string[] = [];

        for (const name of Object.keys(this.columns) as (keyof T)[]) {
            const { type, nullable, extra, references } = this.columns[name];

            const line: string[] = [name.toString(), type];

            if (!nullable) {
                line.push("NOT NULL");
            }

            if (extra !== undefined) {
                line.push(...extra);
            }

            if (references !== undefined) {
                const { db, key, onDelete } = references;

                line.push(
                    `REFERENCES ${db.tableNameText}(${key.toString()}) ON DELETE ${onDelete}`,
                );
            }

            body.push(line.join(" "));
        }

        if (this.tableExtra?.constraints !== undefined) {
            body.push(...this.tableExtra.constraints);
        }

        await pg.unsafe(`CREATE TABLE IF NOT EXISTS ${this.tableNameText} (${body.join(",")})`);

        if (this.tableExtra?.indexes !== undefined) {
            await Promise.all(
                this.tableExtra.indexes.map((key) => {
                    return new Promise((resolve, reject) => {
                        const name = `idx_${this.tableNameText}_${key.toString()}`;

                        pg.unsafe(
                            `CREATE INDEX IF NOT EXISTS ${name} ON ${this.tableNameText}(${key.toString()})`,
                        )
                            .then(resolve)
                            .catch((error) => {
                                log(
                                    `Error creating index ${colorize(key.toString(), Color.FgRed)} on table ${colorize(this.tableNameText, Color.FgRed)}`,
                                );
                                console.error(error);
                                reject();
                            });
                    });
                }),
            );
        }
    }

    //#region Select

    /** Selects the given keys on a matching row. */
    protected async select<K extends Exclude<keyof T, PrimaryKey>>(
        id: T[PrimaryKey],
        keys: K[],
    ): Promise<Pick<T, K> | undefined> {
        try {
            const [selectedRow] = await pg<Pick<T, K>[]>`
                SELECT ${sql.unsafe(keys.join(", "))}
                FROM ${this.tableName}
                WHERE ${this.primaryKey} = ${id}
            `;

            return selectedRow;
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    /** Selects the given keys on all matching rows. */
    protected async selectMultiple<K extends keyof T>(
        ids: T[PrimaryKey][],
        keys: K[],
    ): Promise<Pick<T, K>[]> {
        try {
            return await pg`
                SELECT ${sql.unsafe(keys.join(", "))}
                FROM ${this.tableName}
                WHERE ${this.primaryKey} = ANY(${sql.array(ids, "TEXT")})
            `;
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    /** Selects the given keys on matching rows. */
    protected async selectWhere<K extends keyof T>(
        where: SQL.Query<T>,
        keys: K[],
    ): Promise<Pick<T, K>[]> {
        try {
            return await pg`
                SELECT ${sql.unsafe(keys.join(", "))}
                FROM ${this.tableName}
                WHERE ${where}
            `;
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    /** Selects the given keys on **all** rows. */
    protected async selectAll<K extends keyof T>(keys: K[]): Promise<Pick<T, K>[]> {
        try {
            return await pg`
                SELECT ${sql.unsafe(keys.join(", "))}
                FROM ${this.tableName}
            `;
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    protected async search<K extends keyof T>(
        where: SQL.Query<T>,
        keys: K[],
        page: number,
        perPage: number,
        orderBy: keyof T,
        order: "asc" | "desc",
    ): Promise<WithPagination<Pick<T, K>>> {
        try {
            const items = await pg<(Pick<T, K> & { total_count: string })[]>`
                SELECT
                    ${sql.unsafe(keys.join(", "))},
                    COUNT(*) OVER() AS total_count
                FROM ${this.tableName}
                ${where}
                ORDER BY ${sql(orderBy)} ${sql.unsafe(order)}
                LIMIT ${perPage}
                OFFSET ${page * perPage}
            `;

            if (items.length === 0) {
                return { items: [], totalItemCount: 0 };
            }

            return { items, totalItemCount: Number(items[0]!.total_count) };
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    //#endregion

    //#region Update

    /** Updates an existing row, returning its ID (or `null` if no row was found to update). */
    protected async update(
        id: T[PrimaryKey],
        value: UpdatePayloadFor<T, PrimaryKey>,
    ): Promise<T[PrimaryKey] | undefined> {
        try {
            const [updatedRow] = await pg<Pick<T, PrimaryKey>[]>`
                UPDATE ${this.tableName}
                SET ${sql(value)}
                WHERE ${this.primaryKey} = ${id}
                RETURNING ${this.primaryKey}
            `;

            return updatedRow?.[this.primaryKeyText];
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    /** Identical to {@link update} with extra query options. */
    protected async updateExtra(
        id: T[PrimaryKey],
        value: UpdatePayloadFor<T, PrimaryKey>,
        extra: SQL.Query<T>,
    ): Promise<T[PrimaryKey] | undefined> {
        try {
            const [updatedRow] = await pg<Pick<T, PrimaryKey>[]>`
                UPDATE ${this.tableName}
                SET ${sql(value)}, ${extra}
                WHERE ${this.primaryKey} = ${id}
                RETURNING ${this.primaryKey}
            `;

            return updatedRow?.[this.primaryKeyText];
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    /** Updates the matching rows, returning their IDs. */
    protected async updateWhere(
        where: SQL.Query<T>,
        value: UpdatePayloadFor<T, PrimaryKey>,
    ): Promise<T[PrimaryKey][]> {
        try {
            const updatedRows = await pg<Pick<T, PrimaryKey>[]>`
                UPDATE ${this.tableName}
                SET ${sql(value)}
                WHERE ${where}
                RETURNING ${this.primaryKey}
            `;

            return updatedRows.map((x) => x[this.primaryKeyText]);
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    //#endregion

    //#region Insert

    /** Inserts a new row, returning its ID. */
    protected async insert(value: InsertPayloadFor<T, PrimaryKey>): Promise<T[PrimaryKey]> {
        try {
            const [insertedRow] = await pg<[Pick<T, PrimaryKey>]>`
                INSERT INTO ${this.tableName} ${sql(value)}
                RETURNING ${this.primaryKey}
            `;

            return insertedRow[this.primaryKeyText];
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    /** Inserts a new row or updates an existing one, returning the given keys. */
    protected async upsert<K extends keyof T>(
        insert: InsertPayloadFor<T, PrimaryKey>,
        update: UpdatePayloadFor<T, PrimaryKey>,
        keys: K[],
    ): Promise<Pick<T, K>> {
        try {
            const [upsertedRow] = await pg<[Pick<T, K>]>`
                INSERT INTO ${this.tableName} ${sql(insert)}
                ON CONFLICT (${this.primaryKey}) DO UPDATE SET ${sql(update)}
                RETURNING ${sql.unsafe(keys.join(", "))}
            `;

            return upsertedRow;
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    //#endregion

    //#region Delete

    /** Deletes an existing row, returns `true` if it was found and deleted. */
    protected async delete(id: T[PrimaryKey]): Promise<boolean> {
        try {
            const deletedRows = await pg`
                DELETE FROM ${this.tableName}
                WHERE ${this.primaryKey} = ${id}
            `;

            return deletedRows.count > 0;
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    /** Deletes matching rows, returning the number of rows deleted. */
    protected async deleteWhere(where: SQL.Query<T>): Promise<number> {
        try {
            const deletedRows = await pg`
                DELETE FROM ${this.tableName}
                WHERE ${where}
            `;

            return deletedRows.count;
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    /** Deletes an existing row, returning the given keys if it was found and deleted. */
    protected async deleteReturning<K extends Exclude<keyof T, PrimaryKey>>(
        id: T[PrimaryKey],
        keys: K[],
    ): Promise<Pick<T, K> | undefined> {
        try {
            const deletedRows = await pg<Pick<T, K>[]>`
                DELETE FROM ${this.tableName}
                WHERE ${this.primaryKey} = ${id}
                RETURNING ${sql.unsafe(keys.join(", "))}
            `;

            return deletedRows[0];
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    //#endregion

    //#region Joins

    public static async join<
        MainModel,
        OtherModel,
        MainTableName extends string,
        OtherTableName extends string,
        MainKeys extends keyof MainModel,
        OtherKeys extends keyof OtherModel,
        Type extends "inner" | "left" = "inner",
    >(
        main: JoinSource<MainModel, MainTableName, MainKeys>,
        other: JoinSource<OtherModel, OtherTableName, OtherKeys>,
        params: JoinParams<MainModel, OtherModel>,
        type: Type,
    ): Promise<
        Joined<
            MainModel,
            MainTableName,
            MainKeys,
            OtherModel,
            OtherTableName,
            OtherKeys,
            Type extends "left" ? true : false
        >[]
    > {
        const { joinOn, where } = params;

        const select: string[] = [];

        const mainTable = main.from.tableNameText;
        const otherTable = other.from.tableNameText;

        for (const key of main.select) {
            const field = key.toString();
            select.push(`${mainTable}.${field} AS ${mainTable}_${field}`);
        }

        for (const key of other.select) {
            const field = key.toString();
            select.push(`${otherTable}.${field} AS ${otherTable}_${field}`);
        }

        try {
            return await pg`
                SELECT ${sql.unsafe(select.join(", "))}
                FROM ${main.from.tableName}
                ${sql.unsafe(type)} JOIN ${other.from.tableName}
                ON ${joinOn}
                WHERE ${where}
            `;
        } catch (error) {
            throw wrapPgError(error);
        }
    }

    public static async joinSimple<
        MainModel,
        OtherModel,
        MainTableName extends string,
        OtherTableName extends string,
        MainKeys extends keyof MainModel,
        OtherKeys extends keyof OtherModel,
        Type extends "inner" | "left" = "inner",
    >(
        main: SimpleJoinSource<MainModel, MainTableName, MainKeys>,
        other: SimpleJoinSource<OtherModel, OtherTableName, OtherKeys>,
        where: SQL.Query<MainModel | OtherModel>,
        type: Type,
    ): Promise<
        Joined<
            MainModel,
            MainTableName,
            MainKeys,
            OtherModel,
            OtherTableName,
            OtherKeys,
            Type extends "left" ? true : false
        >[]
    > {
        const joinA = `${main.from.tableNameText}.${main.join.toString()}`;
        const joinB = `${other.from.tableNameText}.${other.join.toString()}`;

        const joinOn = sql.unsafe(`${joinA} = ${joinB}`);

        return await this.join(main, other, { joinOn, where }, type);
    }

    //#endregion
}
