# Paid Events Contract

This document fixes the website/plugin/API contract. Purchases never require the
buyer or the server to be online. Only servers `1` (Pantheon #1) and `2`
(Pantheon #2) exist. Public responses never include commands, tokens, or buyer
IDs.

The authoritative implementation of every rule below is
`src/services/publicEvents.ts` plus `src/services/publicEventCommands.ts`.

## Website

| Method | Route                                     | Authentication     | Response                                                                      |
| ------ | ----------------------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| GET    | /public-events/catalog                    | Public             | supported enabled `{id,name,description,image,cost,category,requiresDonor}[]` |
| GET    | /public-events/servers                    | Public             | `{id,name,enabled,online,pendingCount,gapRemaining}[]`                        |
| GET    | /public-events/queue                      | Public             | `{items,totalItemCount}`                                                      |
| POST   | /users/@me/public-events                  | Session            | `{orderId,balance,pendingCount}`                                              |
| GET    | /public-events/admin/catalog              | EditEconomyRewards | catalog plus `command,enabled,supported`                                      |
| POST   | /public-events/admin/catalog              | EditEconomyRewards | full catalog row                                                              |
| PATCH  | /public-events/admin/catalog/:id          | EditEconomyRewards | full catalog row                                                              |
| GET    | /public-events/admin/servers              | EditTokens         | servers plus `pluginTokenId`                                                  |
| PATCH  | /public-events/admin/servers/:serverId    | EditTokens         | admin server                                                                  |
| GET    | /public-events/admin/orders               | EditEconomyRewards | `{items,totalItemCount}` history and recovery                                 |
| POST   | /public-events/admin/orders/:id/reconcile | EditEconomyRewards | `{ok:true}`                                                                   |

Purchase body: `{eventId,serverId,expectedPrice,requestId}`; `requestId` is a
UUID scoped to the authenticated buyer. Reusing it with a different payload is
rejected. Reusing it with the same payload returns the original order without a
second charge. The debit and the queue row commit in one transaction.

New EVENT purchases require an authoritative donor OR staff role from Bots Supabase
`public.roles`, queried using the verified `session.userId` as Discord ID.
Primary `role` and secondary `other_roles` (array or JSON-string array) are
trimmed and case-normalized. Donor roles are `donator`, `d1bronze`, `d2silver`,
`d3gold`, `d4mega`, and `d5mega`. Staff roles match HELPER and above in the web
`permissionLevels.ts`: `helper`, `tmoderator`, `moderator`, `smoderator`, `admin`,
`scpslstaff`, `discordstaff`, `gamemaster`, `supervisor`, `developer`, `manager`,
`director`, `founder`, and `owner`. Aliases normalize `management` to `manager`,
`discord-staff` to `discordstaff`, and `scpsl-staff` to `scpslstaff`. Any qualifying
primary or secondary role grants event access. Staff eligibility is independent
of donor status: staff are not classified as donors. Upstream edit permissions
alone grant no exemption; client roles or `isDonor` are not accepted. Ordinary
members, unknown roles, or missing rows return 403 with title `Event Access Required`
and text "Only donators and staff can purchase events. Modifiers are available to everyone."
Next should map this title explicitly. Missing configuration, outage, timeout, or malformed trusted
response returns a sanitized 503 with no debit or order insertion.

`requiresDonor` is a required computed boolean in public and admin catalog
responses, never a POST/PATCH field. It is false only for supported canonical
modifier commands `everythingexplodes`, `excorpses`, `ff`, `hsonly`, `lifesteal`,
`gravity`, and `tiny`. Category is presentation metadata, not authorization:
an event mislabeled `modifier` still requires a donor or staff role. Unknown/unsupported admin
entries conservatively report true and remain unpurchasable. Frontend
`ShopEvent.requiresDonor` and proxies must preserve the boolean, not infer it
from category. This field marks restricted EVENT commands, not user donor status;
the frontend allows them when the user is a donor OR staff.

The existing paid order lookup remains first. Same-buyer, same-payload retries
succeed without another lookup or debit after donor/staff role removal or datasource outage;
conflicting payloads are still rejected. Ordinary modifier purchases never consult Bots.
Everything Explodes is the exception: it requires trusted staff membership,
not merely a donor role, and performs the same bounded Bots lookup before charging.
Denial returns 403 with title `Staff Access Required`; missing configuration or
verification failures return 503. The restriction is based on the canonical
`everythingexplodes` command, never its name, category, or client-supplied flags.

Catalog responses additionally include the read-only computed `requiresStaff`
boolean. It is true for Everything Explodes and false for other entries. Next
proxies preserve it, and `/api/me` exposes trusted `isStaff` separately from
`isDonor` and `canPurchaseEvents`. Non-staff users, including donors, see that
modifier disabled with a Staff only badge. Existing paid retries remain idempotent.
For new events only, the no-store REST request and body parsing are bounded to
3 seconds inside the purchase transaction, after identifying the actual catalog
command and before debit/order insertion.

Catalog POST/PATCH body: `{name,description,image,cost,command,enabled,category}` (full
body). Server PATCH body: `{enabled,pluginTokenId}`; the binding is unique and
must reference an existing token. Token secrets are never returned.

`category` is required and is exactly `pvp|survival|minigame|modifier`.
`supported` is a computed, read-only boolean in admin responses, not a payload
field. Public responses omit both commands and support metadata and contain only
enabled entries whose complete command validates for execution. Next proxies
preserve `category`; `/api/admin/events/commands` includes all 30 supported keys
and the 5 known disabled placeholders for staff selection.

Queue/history query: `page=0&perPage=8&serverId=1` (`serverId` optional,
`perPage` <= 100). Public items:
`{id,eventName,serverId,serverName,purchaserName,createdAt,status,position,repeatDeferral}`.
Statuses: `queued|reserved|starting|uncertain|fulfilled`; positions are per-server
execution order. `repeatDeferral` is `none|moved|waiting`, also included in admin
history. No commands or identities beyond purchaser display names are exposed.

The same canonical command cannot run twice consecutively on a server. Song
arguments, catalog IDs, renamed entries, and categories do not make a different
event. Only confirmed purchased starts (including staff-confirmed recovery) set
the previous command; deferrals and ordinary staff events do not reset it.

FIFO is preserved except when avoiding a repeat: the oldest different queued
purchase is promoted ahead of the repeating prefix at each step. The entire
known queued segment is planned and its positions are persisted immediately,
so multiple repeats are separated by different purchases in the visible queue,
not merely promised to move after earlier rounds. Repeats get a
`moved` badge until reserved, or `waiting` when no different queued purchase is
available. A repeat-only queue never executes, even after the cooldown expires.
Purchasing a different entry releases it only after that entry actually runs.
Multiple repeating entries cannot unblock one another; leftover repeats wait
at the end of the segment when no further separator is queued. Live/uncertain attempts
are barriers that are never skipped. Ordering and deferral metadata survive
restart; new purchases never reset a repeat's position. Start authorization
also rechecks the previous command. The three-round cooldown remains unchanged.

Reconcile body: `{outcome:'started'|'retry',reason}`; a non-blank reason is
required and persisted with the actor and timestamp. There is no order deletion
and no automatic refund.

## Plugin

| Method | Route                                             | Body                                              | Response            |
| ------ | ------------------------------------------------- | ------------------------------------------------- | ------------------- |
| POST   | /public-events/servers/:id/heartbeat              | `{instanceId}`                                    | `{ok:true}`         |
| POST   | /public-events/servers/:id/round                  | `{instanceId,roundId,phase}`                      | round decision      |
| POST   | /public-events/servers/:id/orders/:orderId/start  | `{instanceId,roundId,deliveryId}`                 | `{authorized:true}` |
| POST   | /public-events/servers/:id/orders/:orderId/result | `{instanceId,roundId,deliveryId,outcome,message}` | `{ok:true}`         |

`instanceId` is a UUID regenerated on every plugin process start. Instance TTL
is 30 seconds, renewed by every heartbeat and round report; a different instance
inside the TTL window is refused so two schedulers can never run one round.
`roundId` is a UUID the plugin persists until the round ends. `phase` is
`prepare|started|ended`. `message` is at most 1000 characters.

Timing: pre-start lease 120 seconds (refreshed by prepare), start window 14
seconds after the API observes `started`, and 60 seconds for the plugin to
report an outcome after a start is authorised.

Result retries must retain the delivery's original `instanceId`, including when
replaying a durable journal after a process restart. Results do not acquire or
renew instance ownership, and remain accepted when the server is disabled or a
new instance is active, provided the token is still bound to that server. A
`started` result requires a persisted start authorization. Rebinding or revoking
the token requires staff recovery for outstanding results.

## Execution rules

Only one paid event may be authorised per round. The plugin must call `start`
and receive `{authorized:true}` before mutating gameplay, and must never retry
execution after losing a start response — it reports `uncertain` instead.

Authorization retries are limited to the same delivery and original instance;
quarantined or superseded deliveries cannot be authorized again. Once a round
has an authorized attempt, deferral or staff retry cannot authorize another paid
attempt in that same round. Round phase reports never extend the result lease.

Outcomes: `started` marks the order fulfilled and opens a three-round cooldown;
`deferred` means the event definitely did not run and the order returns to the
queue at its original position; `uncertain` quarantines the order for staff.
Identical result retries are harmless. A confirmed `started` can never be
downgraded by a late `deferred` or `uncertain`.

Three completed intervening rounds are required between paid events on a server.
The paid round's own end does not count. Abandoned rounds never count. Staff
events neither reset nor bypass the cooldown, and on a reserved round staff
events and modifiers are blocked entirely.

## Commands

The existing 23 event keys remain accepted, matching `EventCatalog` in PantheonEvents:
`birdistheword dodgeball facilitywarfare hangthedj hideandseek hle knifefight
labyrinth lasertag leapfrog micromanagement modhunt murderinthedark
musicalchairs nukerun nutallergy peanutdodgeball redlightgreenlight scp079escape
scpreplication searchanddestroy traitor zombiesurvival`.

The 7 canonical modifier RA keys are also accepted:
`everythingexplodes excorpses ff hsonly lifesteal gravity tiny`. Modifiers accept
no arguments. The known placeholders `cockfights gungame spleef tag walkingdead`
may be created/edited only while disabled. They always return `supported:false`,
cannot be enabled or purchased, and are excluded from public catalog responses
even if manually enabled in the database. Unknown commands remain rejected.

`hle` is the catalog key for Homelander (RA name `homelander`, alias `hle`); the
plugin resolves by command type, never by sending a console string. Only
`hangthedj` and `musicalchairs` accept one integer argument in `1..11`.
`stop`, `list`, chaining, and aliases are always rejected. Catalog changes never
change the name, command, or cost already snapshotted on a paid order.
