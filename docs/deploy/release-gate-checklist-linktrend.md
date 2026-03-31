# Release Gate Checklist (LiNKpaperclip)

- [ ] Runtime mode set to authenticated/private.
- [ ] Reverse proxy auth gateway enforced.
- [ ] Supabase-backed login + MFA validated.
- [ ] TLS certificates valid and auto-renew checked.
- [ ] CI security gate green (tests + scans).
- [ ] Backup/restore rehearsal executed.
- [ ] Audit trail endpoint validation completed.
- [ ] Deploy references immutable tag/SHA from main/master.
