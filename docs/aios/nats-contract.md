# AIOS NATS Contract (Paperclip Canonical)

Last updated: 2026-03-17

Paperclip is the source of truth for AIOS inter-agent subject taxonomy and envelope shape during MVO.

## Subjects

- `aios.task.created`
- `aios.task.assigned`
- `aios.task.accepted`
- `aios.task.progress`
- `aios.task.handoff`
- `aios.task.completed`
- `aios.task.failed`
- `aios.approval.requested`
- `aios.approval.decided`
- `aios.security.exception`

## Stream and durable consumers

- Stream name: `AIOS_EVENTS` (override with `AIOS_NATS_STREAM`).
- Stream subject bindings:
  - `aios.task.*`
  - `aios.approval.*`
  - `aios.security.*`
- Durable consumers (created by bootstrap):
  - `OPENCLAW_MANAGEMENT` -> `aios.task.created`, `aios.task.assigned`, `aios.approval.requested`
  - `AGENTZERO_EXECUTION` -> `aios.task.assigned`, `aios.task.handoff`
  - `PAPERCLIP_AUDIT` -> `aios.>`

## Required envelope fields

- `event_id`
- `event_type`
- `occurred_at`
- `schema_version`
- `tenant_id`
- `mission_id`
- `run_id`
- `task_id`
- `from_dpr_id`
- `to_dpr_id`
- `correlation_id`
- `idempotency_key`
- `payload`

## Reliability defaults

- At-least-once delivery.
- Consumer ACK required.
- Idempotent processing keyed by `idempotency_key`.
- Bounded retries with dead-letter stream.

## Governance notes

- Slack is the only MVO communications channel.
- Telegram is disabled for MVO.
- Chairman final approval window is 08:00 Asia/Taipei.

## Bootstrap command

Run from Paperclip repo root:

```bash
pnpm nats:bootstrap
```

Environment overrides:

- `AIOS_NATS_URL` (default `nats://127.0.0.1:4222`)
- `AIOS_NATS_STREAM` (default `AIOS_EVENTS`)
- `AIOS_NATS_MAX_DELIVER` (default `10`)
- `AIOS_NATS_ACK_WAIT_MS` (default `90000`)
- `AIOS_NATS_MAX_ACK_PENDING` (default `2000`)
