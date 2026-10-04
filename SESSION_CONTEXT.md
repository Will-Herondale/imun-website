# IMUN_WEB — Working Context (persisted)

> Update this file after every task so progress survives compressions/restarts.

## Objective (current)
Hosting live on **Azure App Service** (imunindia-2026) at imunindia.com — cutover from Netlify complete. Recent work: added "paid but not registered" payment-reconciliation flagging to the admin panel (03 Oct 2026).

## Current session fact sheet
- **Dates**: 24–25 October 2026.
- **Venue**: **fully online** — venue "Online", format "Fully online".
- **Fees**: **flat ₹500 per delegate** (single tier, no rounds, no On-spot mention anywhere).
- **Registrations**: open. `REGISTRATION_OPEN=true` set on Azure app settings AND Netlify env.
- **Committees** (roster = 3, capacity 75 = 25/committee):
  - DISEC
  - UNHRC
  - AIPPM
  - (Lok Sabha/CCC/others removed on 2026-09-28, commit `36a0d08`.)
- **Board (lib/config/board.ts)**: "Under-Secretary-General, Marketing / Atiksh".
- **Hosting**: Azure App Service **`imunindia-2026`**, RG `Pulse`, plan `PulsePlan` (Linux, **B1** Basic, Central India). App host `imunindia-2026.azurewebsites.net`; custom domains `imunindia.com` + `www.imunindia.com` bound with App Service managed TLS (SNI). Apex A → `20.192.171.16`, www CNAME → imunindia-2026.azurewebsites.net (BigRock DNS, asuid TXT verification ID `C7637823FD7F9C8B21DE9CF416B63F0EA5F5D3B6166B72A50A518A4F9905D519`).
- Deploy flow: `npm run build:standalone` → `deploy-artifact/iemun-standalone.zip` → `az webapp deploy --resource-group Pulse --name imunindia-2026 --src-path deploy-artifact/iemun-standalone.zip --type zip --clean true --restart true`. Runtime NODE|24-lts; startup `node server.js`; httpsOnly=true.
- Azure app settings (copy of the Netlify set): ADMIN_EMAIL/PASSWORD/SESSION_SECRET, FAMGATEWAY_API_KEY (fam_027a01b5c6479538ef00a0496e397bdb1eecae56), NETLIFY_DATABASE_URL (Neon), NEXT_PUBLIC_SITE_URL=https://imunindia.com, REGISTRATION_OPEN=true, SITE_MAINTENANCE=false.
- **Netlify halted**: account build credits exhausted; deploys error `Skipped due to account credit usage exceeded` (reset approx 19 Oct 2026 12:30 IST). Netlify CLI deploy → `Forbidden`. Netlify still owns site id `8bf4f6a7-4c41-4d6e-aeed-4083b2764d11` (used as 24h fallback; DNS now points at Azure, so it no longer serves imunindia.com).
- **Payments**: FamGateway. Flow = pay at checkout → poll `/api/payments/status` → POST `/api/registrations` persists row (paid only after server re-verify & amount==fee ₹500; manual UTR → `unverified`). Webhook is HMAC-SHA256 (`X-FamGateway-Signature`, key = FAMGATEWAY_API_KEY). **Payment orphans**: when a success webhook has no linked registration, a `payment_orphans` row is recorded and shown in the admin Registrations tab banner; auto-cleared when the order is finally used, or dismissed via `POST /api/admin/payment-orphans/[orderId]`.
- **DB**: Neon Postgres `ep-muddy-dream-az54zxs7-c-3.ap-southeast-1` → db `neondb` (role neondb_owner). Tables: `registrations` (+ additive migrations), `payment_orphans`. Admin list API returns `items,total,pages,page,grandTotal,orphans,orphanCount`.
- **Rate limit**: registrations 3/IP/10 min; payments 30/IP/10 min; admin login 8/IP/15 min (in-memory, single instance).
- Local dev: `npm run dev`. Tests: 62 passed, typecheck + lint clean.

## Persistent helpers
- **UAC helper**: `scripts/uac/` — `install-uac-helper.ps1` (register scheduled task `IMUN-ElevatedRunner`, one UAC prompt), `elevated-runner.ps1` (runs pending request), `sudo.ps1` (invoke elevated command without prompting). Request dir `%TEMP%\imun-uac\req-<id>.json`.
- **Netlify token**: Netlify CLI config at `C:\Users\Ashwath M\AppData\Roaming\netlify\Config\config.json` (field `users.<id>.auth.token`). User id `6aae48f9a10b67aac791452b`, email newashwath52@gmail.com.

## Key files to touch
- `lib/config/site.ts` — date, venue, format, fees/rounds, registrationLabel, registrationOpen.
- `lib/config/committees.ts` — EU→Lok Sabha, JCC→CCC.
- `lib/config/faq.ts` — fee/online FAQ copy (remove on-spot mention).
- `lib/config/updates.ts` — new update entries (24–25 Oct, fees, committees).
- `lib/config/board.ts` — USG Marketing Atiksh.
- `app/conference/page.tsx`, `app/committees/page.tsx`, `app/eb/page.tsx`, `components/EBApplicationForm.tsx`, `app/page.tsx`, `RegistrationForm.tsx`/`registration-form.html` — committee + date + fee copy.
- `tests/*.test.ts` — committee codes EU/JCC → LS/CCC.
- `lib/seo/structured-data.ts` — venue/attendance mode (online detection keyed on venue.name === "online").

## Security notes
- FamGateway live key `fam_027a01b5c6479538ef00a0496e397bdb1eecae56` still active + spare order `fg_2FF3AG1P`; admin creds (ADMIN_PASSWORD in env) unrotated. Rotate after event if not used.

## Fortinet (open)
- imunindia.com reportedly blocked by Fortinet firewall. Root cause check: DNS resolves (now A → 20.192.171.16, Azure), site 200, HTTPS + strict CSP, no malware indicators. FortiGuard's public URL lookup returns 403 to automated requests, so the block is most plausibly **FortiGuard categorising imunindia.com as "Unrated"/"Newly Registered" (or a stale category)** — FortiGate policies default-block unrated domains.

### Unblock steps (execute on the FortiGate admin)
1. **Confirm the category** — log in to FortiGate → `Security Profiles > Web Filter`, open the profile applied to the outbound policy; run `diagnose webfilter fortiguard lookup imunindia.com` (CLI) or check FortiView `Web Filter` logs for `imunindia.com` to see the category returned.
2. **Local (static) override — instant unblock**: FortiGate → `Web Filter > FortiGuard Category Based Filter`, add `imunindia.com` (and `www.imunindia.com`) to a **local/allow origin-block override** or a static **URL rating override** permitting the domain regardless of category. CLI: `config firewall web-filter-urlfilter` / `config webfilter urlfilter` → add whitelist entry. This is the immediate, reliable fix.
3. **Permanent fix — reclassify with FortiGuard**: submit imunindia.com at https://www.fortiguard.com/webfilter (Search domain → "Suggest different category", pick e.g. *Information Technology* / *Education*, provide a short description and an admin email). FortiGuard re-crawls and re-rates the domain; the new rating syncs to the FortiGuard database within ~24–48h and the block clears network-wide without a local override.
4. **Rebuild DNS/HTTPS trust** (already in place): HTTPS via Netlify cert and a `subresource`-clean CSP mean the site will rate as a normal business/education site on re-crawl.
- **Follow-up**: re-run `diagnose webfilter fortiguard lookup imunindia.com` after reclassification to confirm the category flip. Needs a FortiGate admin login — outside what I can automate from here.

## Time log
- Session started (this run): 2026-09-22, ~16:10 IST — UAC helper install + full site republish + Fortinet handling.

---

### WORK LOG
| Time (IST) | Step | Result |
|---|---|---|
| 16:45 | UAC helper installed | Task `IMUN-ElevatedRunner` registered (Interactive + Highest); `sudo.ps1` wrapper written; silent re-elevation available. |
| 17:00 | Context MD created | `SESSION_CONTEXT.md` persisted. |
| 17:15 | Site config updated | Dates 24–25 Oct, venue physical TBA, fees 1600/2100/2500 (3 rounds, no on-spot), format "In person". |
| 17:20 | Committees updated | JCC→CCC (Continuous Crisis Committee), EU→LS (Lok Sabha). |
| 17:22 | Board updated | USG Marketing = Atiksh. |
| 17:35 | Pages + FAQ + updates + tests | Copy updated across home/conference/committees/eb/EB form/updates/proxy/replica; test fixtures EU→LS, JCC→CCC. |
| 21:34 | Verify (typecheck) | `tsc --noEmit` clean. |
| 21:35 | Verify (tests) | 57/57 passed. |
| 21:35 | Verify (build) | `next build` succeeded. |
| 21:40 | Deploy | Commit `db968f3` pushed → Netlify `6ab2b53d` ready. |
| 22:35 | Env flip | `REGISTRATION_OPEN=true` set on account env; deploy rebuilt. |
| 22:38 | Prod verify | /200, /registration open (422 vs previous 409), /eb /committees /conference 200; "Venue to be announced", "24–25 October", ₹1,600, Lok Sabha + CCC visible. |
| 22:50 | Fortinet | Root cause documented; FortiGuard lookup is 403 to bots; admin-side unblock + reclassify steps written. |
| **2026-09-22 ~22:50 IST** | **ALL TASKS COMPLETE** | **UAC helper + site republish + Fortinet doc done.** |
| 2026-09-27 | Online format confirmed | Venue "Online", format "Fully online" (commit `7044ae7`). |
| 2026-09-28 | Flat fee ₹500 | Single flat ₹500 fee applied across site/FAQ/pages/tests (commit `14ae1a2`). |
| 2026-09-28 | Roster → AIPPM only | DISEC/UNHRC/AIPPM, capacity 75 (commit `36a0d08`); flat fee + AIPPM not live on Netlify (credits exhausted). |
| 2026-09-28 | Azure cutover | Built + deployed standalone to App Service **imunindia-2026** (B1). Bound imunindia.com + www on Azure, managed TLS SNI certs issued/bound. DNS (BigRock): apex A → 20.192.171.16, www CNAME → imunindia-2026.azurewebsites.net, asuid TXT verification. Netlify kept as 24h fallback (now out of path). |
| 2026-10-03 | Registration triage | SG reported 3 paid registrations missing from admin. Neon had exactly 1 (Saptajit Das, unverified, UTR 130636058736). Root cause: registration only persists on final POST; paid-but-incomplete submits are silently lost. Verified live write path end-to-end (test row created → seen in admin API → deleted). |
| 2026-10-03 | Orphan reconciliation feature | `payment_orphans` table + store (`lib/storage/paymentOrphans.ts`); webhook records paid-but-unregistered orders; registration POST auto-clears orphan; admin list returns `orphans`/`orphanCount`; dashboard shows reconciliation banner with Dismiss (`POST /api/admin/payment-orphans/[orderId]`). Tests 62/62, lint + typecheck clean; deployed to Azure and verified live (table exists, resolve endpoint 200). |
| 2026-10-03 | Refund investigation | FamGateway docs.confirmed: **no refund/list-orders API exists** (non-custodial — 100% of funds go peer-to-peer to merchant's FamPay UPI wallet; merchant refunds manually from FamApp/UPI app). Order lookup requires `order_id`; `/api/verify-order.php?api_key=&order_id=` returns utr+sender_name+amount; PDF receipt at `/transaction-details.php?id=ORDER_ID&download=pdf`. No way to enumerate orders via API — order IDs/payer names only visible in FamGateway dashboard (famgateway.in → sign in → orders). Webhook route + `lib/log.ts` do NOT persist payloads (console only), so the 3 order IDs aren't recoverable from our side. |
| **2026-10-03** | **STATE** | **Live on Azure; orphan-flag feature deployed. Payment reconciliation parked on user's request — resume by pulling the 3 order IDs (or sender names) from the FamGateway dashboard (famgateway.in → orders).** |
| 2026-10-04 | Refunds closed | User confirmed all 3 refunds completed manually. Deleted the refunded Saptajit Das registration from production Neon. `registrations=0`, `payment_orphans=0`, `registration_intents=0` (verified). |
| 2026-10-04 | Server-persisted registration flow | Answers are now saved to Neon **before** payment: `lib/storage/registrationIntents.ts` (`registration_intents`, 256-bit resume token stored only as SHA-256, `state`, `quoted_amount`, `claim_token`/`claimed_at` lease). `POST /api/registrations/intents` creates the draft + FamGateway order (returns `checkoutUrl`); `POST /api/payments/webhook` finalises server-side; `POST /api/registrations/complete` + `/registration/complete` is the browser fallback that polls with the token. `lib/registrations/finalize.ts` is the single writer. |
| 2026-10-04 | Hardening | Webhook: HMAC over raw body, 64 KiB cap, 5xx for retryable outcomes (`no_draft`, gateway/storage failure, lost lease), orphan row written **first** and cleared on success, 200 only for terminal outcomes. Fee is compared against the draft's `quoted_amount` (not the live fee). One-registration-per-email payments are folded into the existing row and deliberately **left** in the reconciliation queue for a refund decision. Lease `CLAIM_STALE_SECONDS=60`; `complete()` returns false when a lease was taken over. Drafts purge after `INTENT_RETENTION_DAYS=7` (open drafts 3× longer). |
| 2026-10-04 | Verification | `tsc` clean, `eslint` clean, unit **106 passed / 9 skipped**, Neon integration **9 passed** (`RUN_DB_INTEGRATION=1`), standalone build (10.8 MB), Playwright **18 passed** (desktop + mobile). Two independent read-only subagent reviews; visible findings addressed. |
| 2026-10-04 | Deployed (`ae93b5d`) | Pushed + `az webapp deploy` to **imunindia-2026** (`RuntimeSuccessful`). Live checks: `/`, `/registration`, `/registration/complete`, `/privacy`, `/faq` all 200; unsigned webhook → 401 `INVALID_SIGNATURE`; `POST /api/registrations/intents` → 201 with checkout URL, row read back via `POST /api/registrations/complete` (`state=awaiting_payment`, `feeAmount=500`), `quoted_amount=500` confirmed in Neon. Test order `fg_VQIAB1V2` (unpaid) deleted; all three tables back to 0 rows. |
| **2026-10-04** | **STATE** | **Live on Azure with the server-persisted registration flow verified end-to-end (draft → order → read-back). Open policy question: manual UTR submissions in `app/api/registrations/route.ts` still create `unverified` rows with no gateway check. A genuine paid webhook delivery still needs one real ₹500 payment to confirm.** |