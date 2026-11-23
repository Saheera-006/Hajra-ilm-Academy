# Cloudflare Pages deployment — Hajara Ilm Academy

1. Keep Firebase Hosting live until testing succeeds. Connect this repository to Cloudflare Pages.
2. Framework: Vite; **Root directory**: `frontend`; build: `npm run build`; output: `dist`.
3. **Do not set** `VITE_API_BASE_URL` to the Render URL in Cloudflare. Leave it unset (or empty) so requests use `/api/...`.
4. Pages Functions in `frontend/functions/api/[[path]].js` proxies API calls to Render. Confirm it is deployed in Cloudflare's Functions view.
5. Verify `https://<your-site>.pages.dev/api/portal/csrf` returns JSON and cookies are scoped to `.pages.dev` hostname. Test registration, email verification, login, admin, certificate, uploads and logout on mobile Safari, Chrome, Firefox and Brave with third-party cookies blocked.
6. Render environment can use `SESSION_COOKIE_SAME_SITE=lax`, `CROSS_SITE_COOKIES=false`, `SESSION_COOKIE_SECURE=true` once exclusively using same-origin proxy. Keep existing Firebase origin settings until migration is complete.
7. Firebase Cloud Messaging is origin-specific: verify `firebase-messaging-sw.js` on Pages and re-register notification subscriptions on the new domain. Existing subscriptions cannot automatically move.
8. Render free cold starts still occur. API requests now have a bounded timeout; retry failed GET actions after wake-up. Avoid repeating payments or registrations automatically.
9. Keep secrets in Render; no database or Brevo API secrets belong in frontend or Cloudflare client build variables.
10. If Pages Functions do not deploy with the selected Git setup, stop and inspect build output rather than switching production traffic.

**Important:** This is a prepared deployment candidate, not a tested live deployment. Before accepting payments, verify cookie/CSRF behavior and webhook processing end to end. Cloudflare may change free-tier limits or policies.
