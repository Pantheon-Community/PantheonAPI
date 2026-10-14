# Disposable PostgreSQL Verification

`test:integration` runs the real paid-events DDL and service functions against
an explicitly supplied disposable PostgreSQL database. It is a standalone
`.integration.ts` runner, not a Bun-discovered test, and is never invoked by
ordinary `test` or `check-all`.

## Safety Requirements

- Set `PAID_EVENTS_DISPOSABLE_URL` explicitly. There is no `DATABASE_URL` fallback.
- The URL must be `postgresql://paid_events_test@127.0.0.1:<high-port>/pantheon_paid_events_disposable`, without a password, query parameters, or fragment. The port must be in `49152..65535`.
- Before any DDL, the runner checks PostgreSQL's actual `data_directory`. Its real path must be `paid-events-pg-<alphanumeric>/data` directly under the approved `/var/folders/rk/sm2_j57s1m5c4lfkk36rqq7h0000gn/T/opencode` directory.
- The database must contain no user tables. A second run against an already populated database is refused. Recreate only the disposable database or cluster to rerun.
- The runner closes its SQL pool in `finally`. Cluster startup and shutdown remain the caller's responsibility.

Initialize a new cluster with the synthetic superuser `paid_events_test`, a
dedicated loopback port and Unix socket, and create the empty database
`pantheon_paid_events_disposable`. Never point this command at an existing
application database.

Run with automatic environment-file loading disabled for both the outer Bun
process and its child:

```sh
BUN_OPTIONS=--no-env-file \
PAID_EVENTS_DISPOSABLE_URL=postgresql://paid_events_test@127.0.0.1:55479/pantheon_paid_events_disposable \
npx --yes bun run test:integration
```

To include the real loopback HTTP API and plugin scheduler harness, also provide
`PANTHEON_PLUGIN_TOKEN` and use the plugin integration command:

```sh
BUN_OPTIONS=--no-env-file \
PANTHEON_PLUGIN_TOKEN=dedicated-test-token \
PAID_EVENTS_DISPOSABLE_URL=postgresql://paid_events_test@127.0.0.1:55479/pantheon_paid_events_disposable \
npx --yes bun run test:integration:plugin
```

## Coverage

The runner creates only the minimal synthetic `users`, `steam_users`, and
`plugin_tokens` dependencies, then uses the actual paid-events table initializer
and service queries. Each group resets fixtures only after the safety checks.

- DDL creation and repeat initialization.
- Legacy catalog category migration, every exact price-sheet row, normalized command reuse, disabled placeholders, and staff edits surviving repeat bootstrap.
- V1-to-v2 price-only upgrade for all ten revised commands, preserving staff fields, variants, unrelated prices, and purchased snapshots; concurrent migration and subsequent staff price edits survive restart.
- Concurrent bootstrap attempts create no duplicate commands; supported modifiers use the unchanged purchase/reservation contract.
- Unsupported entries cannot enable/buy or leak into public catalogs, even after direct database enablement; bootstrap preserves queued order snapshots.
- Concurrent identical requests, conflicting payloads, and rollback after a debit.
- Synthetic mocked Bots REST donor fixtures only, with no live roles requests or key reads.
- Ordinary member/unknown-role denial despite category spoofing; upstream edit-permission labels do not grant access; missing/outage/malformed datasource returns 503 with no debit/order.
- Bots staff primary roles, secondary arrays/JSON strings, normalized aliases, and paid retries after staff removal. Unit checks cover every web HELPER-and-above role, generic helper, and all aliases in primary and both secondary forms.
- Secondary JSON-string donor roles; paid idempotent retries after role removal and missing configuration; modifier purchases require no lookup/configuration.
- Concurrent distinct purchases across servers and users sharing one Steam balance.
- FIFO reservation, duplicate authorization/results, deferral, and three completed intervening rounds. Prepare-only and abandoned rounds do not count.
- Repeat-only queues wait indefinitely; the oldest different purchase moves ahead of repeats, with persisted deferral metadata and correct public positions. Covers concurrent reservations, start rechecks, non-executed deferrals, staff-confirmed starts, uncertainty barriers, per-server independence, and song/name/category variants.
- Lease expiry, uncertain quarantine, staff recovery/audits, and stale-delivery isolation.
- Original-instance journal results after takeover and duplicate results after disabling.
- Public/admin reads, empty-page counts, filtering, catalog snapshots, and token binding/rebinding.

The optional plugin command additionally exercises the production HTTP route
handlers, plugin-token authorization, scheduler timing, durable result retry,
and game-boundary stubs. It does not replace live SCP:SL/LabAPI gameplay or
the Next proxies.
