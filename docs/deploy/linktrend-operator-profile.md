# LiNKtrend Operator Deployment Profile

This profile is the required Paperclip runtime posture for LiNKtrend production.

## Required runtime mode
- `PAPERCLIP_DEPLOYMENT_MODE=authenticated`
- `PAPERCLIP_DEPLOYMENT_EXPOSURE=private` (behind Tailscale/private ingress)

`local_trusted` is for local-only development and is not production-eligible.

## Access model
- Operators enter through reverse proxy auth gateway.
- Supabase Auth session is required at gateway level.
- MFA must be enforced in Supabase auth policy.
- Paperclip service is on internal network only.

## Network controls
- HTTPS/TLS mandatory for operator entrypoints.
- Tailscale is primary access path.
- IP allowlist is secondary perimeter only.

## Release gate
- Startup config must show authenticated mode.
- Unauthenticated direct access to Paperclip UI/API must fail.
- Audit log retrieval from activity endpoints must work.
- Backup command and restore rehearsal must be documented for each release.

## Supabase alignment note
- If Paperclip is deployed against Supabase in the shared internal project, use a dedicated schema namespace (`paperclip_core`) and a dedicated runtime DB role.
- Do not grant Paperclip runtime direct write access to LiNKbrain/LiNKskills/LiNKautowork/LiNKsites schemas.
