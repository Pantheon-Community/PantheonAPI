# Paid Events Deployment

## Release Order

1. Publish `shared/types/PublicEvents.ts` in the PantheonAPI-Types repository and update the API submodule reference. The contract currently exists as a local submodule change; deploying only the parent repository does not include it.
2. Deploy PantheonAPI. Startup creates the paid-events tables and the two server rows before HTTP starts. Back up the database before deploying schema changes.
3. Deploy the Next API backend (`pantheon-web`) and SPA (`pantheon-web-new`). The Shop Events tab is `/shop?tab=events`; administration is `/admin/events`.
4. Install the updated PantheonEvents plugin on servers 1 and 2, configure separate dedicated plugin tokens, and enable scheduling. PantheonShop continues to provide credits; paid-event delivery does not use its item-delivery queue.
5. Review the seeded catalog and installed gameplay dependencies before binding/enabling servers. The supported price-sheet entries are initially enabled, but both servers remain disabled on a fresh database, so sales remain gated. Existing server enablement is preserved on upgrades; disable servers before deploying if sales must remain closed during review.

## Catalog Bootstrap

Startup adds the constrained `category` column to existing catalogs and applies
the v1 bootstrap in `src/services/publicEventSeed.ts` exactly once per database. The atomic
`public_event_bootstrap` marker `categorized-price-sheet-v1` prevents subsequent
restarts or concurrent API instances from overwriting staff edits. Back up first:
the first bootstrap intentionally replaces sheet entry names, prices, categories,
and enablement with the supplied sheet, while preserving IDs, descriptions, media,
and all purchased order snapshots. Existing normalized bare commands are updated
instead of duplicated. Pre-existing duplicate rows are retained, not deleted.

The exact sheet has 28 entries: 16 supported events, 7 supported modifiers, and 5
disabled placeholders. The stated 17-event total does not match the listed rows;
no unlisted priced event is invented. The other 7 allowlisted events receive
category defaults and, when absent, disabled price-0 entries; existing prices and
enablement remain staff-controlled. Existing song variants receive categories
without changing their prices. Unknown pre-existing entries default to `minigame`
and cannot be purchased unless their complete command is supported.

After v1, startup applies the separate atomic `categorized-price-sheet-v2` marker
and one-time price-only rollout to existing normalized bare commands:
`hangthedj` 1800, `micromanagement` 1800, `leapfrog` 1800,
`murderinthedark` 2500, `nukerun` 1200, `cockfights` 2500, `dodgeball` 2000,
`musicalchairs` 2800, `tag` 2000, and `tiny` 1800. This intentionally overrides
any staff prices for those bare commands once, including retained duplicate rows.
Names, enablement, categories, descriptions, media, IDs, and purchased order
snapshots are unchanged. Song variants, custom commands, and all other prices
remain staff-controlled. No missing entries are inserted by v2. Fresh databases
seed the revised prices through v1 and also record v2. Subsequent startups and
concurrent instances preserve staff price edits after v2 commits.

Never delete either bootstrap marker to refresh a staff-edited catalog. Future price
sheet changes need a separately reviewed migration. Deploy shared types, API, and
Next backend together: category is now required in full catalog POST/PATCH bodies,
and admin consumers must treat `supported:false` entries as non-enableable. No SPA
or plugin files are changed by this backend release.

No credentials belong in source control. Do not reuse a plugin token across servers or use the Shop token for event scheduling.

## Permissions And Configuration

Configure the API process (not only Next) with
`BOTS_NEXT_PUBLIC_SUPABASE_URL` and server-side `BOTS_SUPABASE_SERVICE_ROLE_KEY`.
If the service key is absent, `BOTS_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
is used; its access policies must allow the authoritative `public.roles` read.
The REST query selects `role,other_roles`, filters `discord_id=eq.<verified ID>`,
and uses the public schema. Never expose the service key to browsers or logs.
These variables are lazy: API startup, catalogs, modifiers, and paid-order retries
do not require them. New event purchases fail closed with 503 when configuration
or the datasource is unavailable, and 403 for ordinary members without a donor
or staff role, with no charge. Staff access uses actual Bots HELPER-tier-and-above
roles (including generic `helper`) and the web aliases, not upstream edit permissions.

Release the updated shared catalog type/spec, API, and field-preserving Next
proxy before the frontend that requires `ShopEvent.requiresDonor: boolean`.
Check that both public and admin catalog responses include it. No schema migration
is needed for this derived field. `requiresDonor` marks restricted events; allow
donor OR staff without changing the user's donor boolean. Next must map the
403 title `Event Access Required` to the donator/staff eligibility message.
In staging, verify donor and staff primary/secondary roles can buy events, an ordinary member
can buy every supported modifier without Bots configuration, and a category-spoofed
event cannot be bought by an ordinary member. Retry a paid request after removing its
donor/staff role and verify the original order returns with no second debit.

Website access retains the existing management-rank gate. The upstream API additionally requires `EditEconomyRewards` for catalog, order history, and recovery, and `EditTokens` for server/token administration. These permissions are independent.

Use the generated LabAPI config's `purchased_events` section with `enabled`, `server_id` (`1` or `2`), `api_url`, and `token`. The API URL must be an HTTPS root URL without `/api`, query parameters, or credentials. Scheduling is disabled by default.

Keep `PantheonEvents/paid-events-journal.json` and its lock file under the LabAPI configs directory across process restarts. Use different journals for each server. Back up the journal with the server's configuration and restrict its filesystem access: it contains delivery identifiers and commands, although it never stores tokens.

Do not delete or edit a journal to resolve an uncertain order. A corrupt journal disables fulfillment; a runtime write failure blocks staff commands until reload. Loading the scheduler during an active round skips paid execution for that round.

## Recovery

Everything Explodes is purchasable only by users with a trusted Bots staff role.
Donations alone do not grant access. It requires the Bots role-source configuration,
unlike ordinary modifiers. Deploy the API and Next `/api/me` changes before the
frontend so its `requiresStaff` and `isStaff` flags are available.

The `catalog-descriptions-v1` bootstrap fills blank catalog descriptions and
replaces the old local-fixture placeholder with player-facing gameplay copy.
Existing staff-written descriptions, prices, enablement, and paid orders are
preserved. After it runs, future restarts do not overwrite description edits.

Paid events and modifiers cannot repeat consecutively on the same server. A
repeat-only queue waits for a different purchased command; intervening normal
rounds alone do not release it. Queue badges distinguish repeats moved behind
another purchase from repeats waiting for a different purchase. Uncertain
deliveries still require recovery and are never skipped to avoid a repeat.

An uncertain head order intentionally blocks that server's FIFO queue. Inspect the plugin logs and actual gameplay before reconciling in administration:

- **Confirm started** only when the purchased event actually ran. This fulfills the order and records its paid round for cooldown.
- **Retry** only after confirming the previous attempt did not execute and cannot still execute. An incorrect retry can duplicate gameplay. The order retains its original queue position.

Every reconciliation requires a reason and is audited. There is no automatic refund or order deletion. Disabling a server preserves its queue. Rebinding/revoking a token can prevent outstanding journal acknowledgements and may require staff recovery.

## Acceptance Checks

Use a staging game server and synthetic credits before opening sales:

1. Purchase while the buyer is offline, then verify the correct server's FIFO order and single debit.
2. Verify one paid event per eligible round and three normally completed intervening rounds before the next paid event. Abandoned rounds must not reduce the gap.
3. Verify staff, console, voted events, and modifiers cannot start in a reserved round.
4. Simulate API outages and restart the plugin. Lost authorization must never execute gameplay; executed events with lost result responses must acknowledge from the durable journal without replay.
5. Check mobile and desktop purchase/recovery flows, independent permission combinations, and public responses for absence of commands, token metadata, and buyer IDs.

Automated checks cover API transactions against disposable PostgreSQL, proxy behavior, and plugin scheduling with game-boundary stubs. They do not replace live SCP:SL/LabAPI gameplay validation or browser interaction testing. See `PAID_EVENTS_INTEGRATION.md` for the isolated database test runner and `PAID_EVENTS_CONTRACT.md` for protocol details.
