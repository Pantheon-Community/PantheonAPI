import type { PluginToken } from "@/shared/types/Common";
import { usersDb, type UserModel } from "./users";
import { Database, type ExternalReference } from "./utils/database";

export interface TokenModel {
    readonly id: string;

    readonly value: PluginToken;

    readonly created_at: Date;

    readonly last_seen_at: Date;

    readonly times_used: number;

    readonly created_by?: UserModel["id"];
}

// class InvalidTokenError extends UnauthorizedError {
//     public constructor() {
//         super({
//             title: "Invalid Token",
//             description: "The provided authorization token was invalid, it may have been deleted.",
//         });
//     }
// }

class TokensDatabase extends Database<TokenModel, "id", "plugin_tokens"> {
    public constructor() {
        super(
            "plugin_tokens",
            "id",
            {
                id: { type: "BIGINT GENERATED ALWAYS AS IDENTITY", extra: ["PRIMARY KEY"] },
                value: { type: "TEXT" },
                created_at: { type: "TIMESTAMP" },
                last_seen_at: { type: "TIMESTAMP" },
                times_used: { type: "INT" },
                created_by: {
                    type: "TEXT",
                    nullable: true,
                    references: {
                        db: usersDb,
                        key: "id",
                        onDelete: "SET NULL",
                    } satisfies ExternalReference<UserModel>,
                },
            },
            { indexes: ["value"] },
        );
    }
}

export const tokensDb = new TokensDatabase();
