# Render sleep recovery V2 — deployment and verification

- Build: `cd frontend && npm ci && npm run build`.
- Cloudflare Pages: root `frontend`, build `npm run build`, output `dist`, Pages Functions `functions/api/[[path]].js`.
- **Critical:** `.env.production` now uses an empty `VITE_API_BASE_URL`. Remove any Cloudflare dashboard environment variable pointing to Render; rebuild and redeploy.
- API GET/HEAD requests retry on temporary 502/503/504 or network failure, with bounded timeouts. Writes are not automatically replayed, including CSRF 403 responses.
- Public content starts with bundled data or last-known-good browser cache, refreshes periodically and on reconnect. New devices without a prior successful load cannot display admin-managed text not bundled in the app. Batch/enrollment status is not reused from stale cache.
- Session check no longer hangs indefinitely and retries after network failures. Protected routes must still require confirmed authentication.
- The Cloudflare proxy returns a controlled 503 when Render is unavailable. It does not prevent Render Free from sleeping.
- Before real students: verify cookies and CSRF with third-party cookies blocked; test registration, admin/student isolation, email OTP, certificates, mobile layouts, and FCM. Never assume a failed payment request did not process; implement gateway idempotency and webhooks before collecting fees.
- Keep Firebase live until Cloudflare tests pass. Firebase URL itself will still have cross-site cookie issues unless migrated.
