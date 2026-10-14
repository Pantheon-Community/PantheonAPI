import { pgUnsafe } from "@/global/pg";
import type { DiscordId } from "@/shared/types/Common";
import type { SteamId64 } from "@/shared/types/SteamUser";
import type { PublicEventCategory } from "@/shared/types/PublicEvents";
import { seedPublicEventCatalog } from "@/services/publicEventSeed";

export interface PublicEventCatalogModel {
    category: PublicEventCategory;
    id: string;
    name: string;
    description: string;
    image: string | null;
    cost: string;
    command: string;
    enabled: boolean;
}

export interface PublicEventServerModel {
    id: string;
    name: string;
    enabled: boolean;
    plugin_token_id: string | null;
    instance_id: string | null;
    instance_until: Date | null;
    current_round: string | null;
    round_number: string;
    last_paid_round_number: string | null;
}

export interface PublicEventRoundModel {
    id: string;
    server_id: string;
    number: string;
    instance_id: string;
    phase: string;
    started_at: Date | null;
    ended_at: Date | null;
    attempted: boolean;
    paid: boolean;
}

export interface PublicEventOrderModel {
    id: string;
    buyer_id: DiscordId;
    steam_id: SteamId64;
    request_id: string;
    payload_hash: string;
    event_id: string;
    server_id: string;
    event_name: string;
    purchaser_name: string;
    command: string;
    cost: string;
    balance_after: string;
    created_at: Date;
    status: string;
    delivery_id: string | null;
    message: string;
    queue_order: string | null;
    repeat_deferral: "none" | "moved" | "waiting";
}

export interface PublicEventDeliveryModel {
    id: string;
    order_id: string;
    round_id: string;
    instance_id: string;
    status: string;
    lease_until: Date;
    authorized_at: Date | null;
    outcome: string | null;
    message: string | null;
    result_instance: string | null;
    created_at: Date;
}

export async function createPublicEventsTables(): Promise<void> {
    await pgUnsafe(`
        CREATE TABLE IF NOT EXISTS public_event_catalog (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            image TEXT,
            cost INTEGER NOT NULL CHECK(cost >= 0),
            command TEXT NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT FALSE
        );

        ALTER TABLE public_event_catalog ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'minigame'
            CHECK(category IN ('pvp', 'survival', 'minigame', 'modifier'));
        CREATE TABLE IF NOT EXISTS public_event_bootstrap (key TEXT PRIMARY KEY);

        CREATE TABLE IF NOT EXISTS public_event_servers (
            id TEXT PRIMARY KEY CHECK(id IN ('1','2')),
            name TEXT NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT FALSE,
            plugin_token_id INTEGER REFERENCES plugin_tokens(id) ON DELETE SET NULL,
            instance_id UUID,
            instance_until TIMESTAMPTZ,
            current_round UUID,
            round_number INTEGER NOT NULL DEFAULT 0,
            last_paid_round_number INTEGER
        );

        INSERT INTO public_event_servers (id, name, enabled)
        VALUES ('1', 'Pantheon #1', FALSE), ('2', 'Pantheon #2', FALSE)
        ON CONFLICT (id) DO NOTHING;

        ALTER TABLE public_event_servers DROP CONSTRAINT IF EXISTS public_event_servers_plugin_token_id_key;

        CREATE TABLE IF NOT EXISTS public_event_rounds (
            id UUID PRIMARY KEY,
            server_id TEXT NOT NULL REFERENCES public_event_servers(id) ON DELETE CASCADE,
            number INTEGER NOT NULL CHECK(number > 0),
            instance_id UUID NOT NULL,
            phase TEXT NOT NULL CHECK(phase IN ('prepare','started','ended','abandoned')),
            started_at TIMESTAMPTZ,
            ended_at TIMESTAMPTZ,
            attempted BOOLEAN NOT NULL DEFAULT FALSE,
            paid BOOLEAN NOT NULL DEFAULT FALSE,
            UNIQUE(server_id, number)
        );

        CREATE INDEX IF NOT EXISTS public_event_rounds_completed_idx
            ON public_event_rounds (server_id, number) WHERE ended_at IS NOT NULL;

        CREATE TABLE IF NOT EXISTS public_event_orders (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            steam_id TEXT NOT NULL REFERENCES steam_users(id) ON DELETE RESTRICT,
            request_id UUID NOT NULL,
            payload_hash TEXT NOT NULL,
            event_id INTEGER NOT NULL REFERENCES public_event_catalog(id) ON DELETE RESTRICT,
            server_id TEXT NOT NULL REFERENCES public_event_servers(id) ON DELETE RESTRICT,
            event_name TEXT NOT NULL,
            purchaser_name TEXT NOT NULL,
            command TEXT NOT NULL,
            cost INTEGER NOT NULL CHECK(cost >= 0),
            balance_after INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            status TEXT NOT NULL DEFAULT 'queued'
                CHECK(status IN ('queued','reserved','starting','uncertain','fulfilled')),
            delivery_id UUID,
            message TEXT NOT NULL DEFAULT '',
            UNIQUE(buyer_id, request_id)
        );

        CREATE INDEX IF NOT EXISTS public_event_fifo_idx
            ON public_event_orders (server_id, id) WHERE status <> 'fulfilled';

        ALTER TABLE public_event_orders ADD COLUMN IF NOT EXISTS queue_order BIGINT;
        ALTER TABLE public_event_orders ADD COLUMN IF NOT EXISTS repeat_deferral TEXT NOT NULL DEFAULT 'none'
            CHECK(repeat_deferral IN ('none', 'moved', 'waiting'));
        CREATE INDEX IF NOT EXISTS public_event_queue_order_idx
            ON public_event_orders (server_id, (COALESCE(queue_order, id)), id) WHERE status <> 'fulfilled';

        CREATE INDEX IF NOT EXISTS public_event_pending_idx
            ON public_event_orders (server_id) WHERE status <> 'fulfilled';

        CREATE TABLE IF NOT EXISTS public_event_deliveries (
            id UUID PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES public_event_orders(id) ON DELETE CASCADE,
            round_id UUID NOT NULL REFERENCES public_event_rounds(id) ON DELETE CASCADE,
            instance_id UUID NOT NULL,
            status TEXT NOT NULL
                CHECK(status IN ('reserved','starting','uncertain','deferred','started','expired')),
            lease_until TIMESTAMPTZ NOT NULL,
            authorized_at TIMESTAMPTZ,
            outcome TEXT,
            message TEXT,
            result_instance UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS public_event_active_delivery_idx
            ON public_event_deliveries (round_id)
            WHERE status IN ('reserved','starting','uncertain','started');

        CREATE INDEX IF NOT EXISTS public_event_delivery_order_idx
            ON public_event_deliveries (order_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS public_event_audit (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES public_event_orders(id) ON DELETE CASCADE,
            delivery_id UUID REFERENCES public_event_deliveries(id) ON DELETE SET NULL,
            actor_id TEXT NOT NULL,
            outcome TEXT NOT NULL,
            reason TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
    `);
    await seedPublicEventCatalog();
}
