import { pgUnsafe } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";

export interface ErrorModel {
    id: string;

    timestamp: Date;

    name: string;

    message: string;

    url: string;

    request_body: string;

    stack: string | null;

    user_id: DiscordId | null;

    cause: ErrorModel["id"] | null;

    commit: string | null;
}

export async function createErrorsTable(): Promise<void> {
    await pgUnsafe(`
        CREATE TABLE IF NOT EXISTS errors (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
            name TEXT NOT NULL,
            message TEXT NOT NULL,
            url TEXT NOT NULL,
            request_body TEXT NOT NULL,
            stack TEXT,
            user_id TEXT,
            cause INTEGER REFERENCES errors(id) ON DELETE CASCADE,
            commit TEXT
        );
    `);
}
