import { NotFoundError } from "@/errors/NotFoundError";
import { UnauthorizedError } from "@/errors/UnauthorizedError";
import type { DiscordId, Ip, Origin, UserAgent, UserToken } from "@/shared/types/Common";
import type { UserSessionBasic, UserSessionId } from "@/shared/types/UserSession";
import type { DiscordAuthData } from "@/types/Discord";
import type { InternalSession } from "@/types/Internal";
import type { RequestAnalytics } from "@/types/RequestAnalytics";
import { castNumber } from "@/utils/castNumber";
import type { ServerTimer } from "@/utils/serverTimer";
import { sql } from "bun";
import { usersDb, type UserModel } from "./users";
import { Column } from "./utils/column";
import {
    Database,
    type ExternalReference,
    type InsertPayloadFor,
    type UpdatePayloadFor,
} from "./utils/database";

export interface UserSessionModel {
    readonly id: string;

    readonly access_token: UserToken;

    readonly refresh_token: UserToken;

    readonly started_at: Date;

    readonly expires_at: Date;

    readonly times_refreshed: number;

    readonly user_id: DiscordId;

    readonly action_count: number;

    readonly last_action_at: Date;

    readonly ip?: Ip;

    readonly user_agent?: UserAgent;

    readonly origin?: Origin;
}

class SessionNotFoundError extends NotFoundError {
    public constructor() {
        super({
            title: "Session Not Found",
            description: "A session with this ID does not exist in the database.",
        });
    }
}

class InvalidTokenError extends UnauthorizedError {
    public constructor() {
        super({
            title: "Invalid Token",
            description:
                "The provided authorization token was invalid, it may have expired or been deleted.",
        });
    }
}

class ExpiredTokenError extends UnauthorizedError {
    public constructor() {
        super({
            title: "Expired Token",
            description: "The provided authorization token has expired, please log back in.",
        });
    }
}

class UserSessionsDatabase extends Database<UserSessionModel, "id", "user_sessions"> {
    public constructor() {
        super(
            "user_sessions",
            "id",
            {
                id: { type: "BIGINT GENERATED ALWAYS AS IDENTITY", extra: ["PRIMARY KEY"] },
                access_token: { type: Column.Token, extra: ["UNIQUE"] },
                refresh_token: { type: Column.Token, extra: ["UNIQUE"] },
                started_at: { type: "TIMESTAMP" },
                expires_at: { type: "TIMESTAMP" },
                times_refreshed: { type: "INT" },
                user_id: {
                    type: Column.Snowflake,
                    references: {
                        db: usersDb,
                        key: "id",
                        onDelete: "CASCADE",
                    } satisfies ExternalReference<UserModel>,
                },
                action_count: { type: "INT" },
                last_action_at: { type: "TIMESTAMP" },
                ip: { type: Column.Ip, nullable: true },
                user_agent: { type: Column.UserAgent, nullable: true },
                origin: { type: Column.OriginUrl, nullable: true },
            },
            { indexes: ["access_token", "expires_at", "user_id"] },
        );
    }

    //#region Basic

    public async createSession(
        authData: DiscordAuthData,
        id: DiscordId,
        analytics: RequestAnalytics,
        timer: ServerTimer,
    ): Promise<UserSessionId> {
        using _ = timer.create("createSession");

        const { ip, userAgent, origin } = analytics;

        const insertPayload: InsertPayloadFor<UserSessionModel, "id"> = {
            access_token: authData.accessToken,
            refresh_token: authData.refreshToken,
            started_at: new Date(),
            expires_at: authData.expiresAt,
            times_refreshed: 0,
            user_id: id,
            action_count: 0,
            last_action_at: new Date(),
        };

        if (ip) insertPayload.ip = ip;
        if (userAgent) insertPayload.user_agent = userAgent;
        if (origin) insertPayload.origin = origin;

        const insertedSessionId = await this.insert(insertPayload);

        return castNumber(insertedSessionId);
    }

    public async getSession(token: UserToken, timer: ServerTimer): Promise<InternalSession> {
        using _ = timer.create("getSession");

        const [session] = await this.selectWhere(sql`access_token = ${token}`, [
            "id",
            "access_token",
            "refresh_token",
            "expires_at",
            "user_id",
        ]);

        if (session === undefined) {
            throw new InvalidTokenError();
        }

        const { id, expires_at, access_token, refresh_token, user_id } = session;

        if (expires_at.getTime() < Date.now()) {
            throw new ExpiredTokenError();
        }

        return {
            id: castNumber(id),
            accessToken: access_token,
            refreshToken: refresh_token,
            userId: user_id,
        };
    }

    public async deleteSession(id: UserSessionId, timer: ServerTimer): Promise<void> {
        using _ = timer.create("deleteSession");

        const wasDeleted = await this.delete(id.toString());

        if (!wasDeleted) {
            throw new SessionNotFoundError();
        }
    }

    //#endregion

    //#region Other

    public async deleteOwnSession(
        id: UserSessionId,
        userId: DiscordId,
        timer: ServerTimer,
    ): Promise<void> {
        using _ = timer.create("deleteOwnSession");

        const wasDeleted = await this.deleteWhere(sql`id = ${id} AND user_id = ${userId}`);

        if (wasDeleted === 0) {
            throw new SessionNotFoundError();
        }
    }

    public async getAllSessions(id: DiscordId, timer: ServerTimer): Promise<UserSessionBasic[]> {
        using _ = timer.create("getAllSessions");

        const sessions = await this.selectWhere(sql`user_id = ${id} AND expires_at > NOW()`, [
            "id",
            "started_at",
            "ip",
            "user_agent",
            "origin",
            "last_action_at",
        ]);

        return sessions.map<UserSessionBasic>((x) => ({
            id: castNumber(x.id),
            startedAt: x.started_at.toISOString(),
            ip: x.ip ?? null,
            userAgent: x.user_agent ?? null,
            origin: x.origin ?? null,
            lastActionAt: x.last_action_at.toISOString(),
        }));
    }

    public async replaceSession(
        id: UserSessionId,
        authData: DiscordAuthData,
        analytics: RequestAnalytics,
        timer: ServerTimer,
    ): Promise<UserSessionId> {
        using _ = timer.create("replaceSession");

        const { ip, userAgent, origin } = analytics;

        const deletedSession = await this.deleteReturning(id.toString(), [
            "started_at",
            "times_refreshed",
            "user_id",
            "action_count",
        ]);

        if (deletedSession === undefined) {
            throw new SessionNotFoundError();
        }

        const { started_at, times_refreshed, user_id, action_count } = deletedSession;

        const insertPayload: InsertPayloadFor<UserSessionModel, "id"> = {
            access_token: authData.accessToken,
            refresh_token: authData.refreshToken,
            started_at,
            expires_at: authData.expiresAt,
            times_refreshed: times_refreshed + 1,
            user_id,
            action_count,
            last_action_at: new Date(),
        };

        if (ip) insertPayload.ip = ip;
        if (userAgent) insertPayload.user_agent = userAgent;
        if (origin) insertPayload.origin = origin;

        const insertedSessionId = await this.insert(insertPayload);

        return castNumber(insertedSessionId);
    }

    public async updateSessionAnalytics(
        id: UserSessionId,
        analytics: RequestAnalytics,
    ): Promise<void> {
        const { ip, userAgent, origin } = analytics;

        const updatePayload: UpdatePayloadFor<UserSessionModel, "id"> = {
            last_action_at: new Date(),
        };

        if (ip) updatePayload.ip = ip;
        if (userAgent) updatePayload.user_agent = userAgent;
        if (origin) updatePayload.origin = origin;

        const updatedSessionId = await this.update(id.toString(), updatePayload);

        if (updatedSessionId === undefined) {
            throw new SessionNotFoundError();
        }
    }

    public async deleteExpiredSessions(): Promise<number> {
        return await this.deleteWhere(sql`expires_at <= NOW()`);
    }

    //#endregion
}

export const userSessionsDb = new UserSessionsDatabase();
