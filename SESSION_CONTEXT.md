# IMUN_WEB — Working Context (persisted)

> Update this file after every task so progress survives compressions/restarts.

## Objective (current)
Push the revised session config to production Netlify (imunindia.com) and unstick the Fortinet firewall block on the domain.

## Current session fact sheet
- **Dates**: 24–25 October 2026 (moved from 10–11 Oct).
- **Venue**: physical, **not yet decided** → render "To be announced"; format "In person".
- **Fees (round-wise, reverted to old scheme; On-spot hidden entirely from the site)**:
  - Round 1: ₹1,600
  - Round 2: ₹2,100
  - Round 3: ₹2,500
  - **Do NOT mention On-spot anywhere on the website.**
  - Round windows must be expanded to work with the new dates (event ends 25 Oct).
  - Old (pre-online) scheme shadow copy (for reference): R1 1600 / R2 2200 / R3 3000 / On-spot 3500.
- **Registrations**: reopen. `REGISTRATION_OPEN=true` (Netlify env currently `false`).
- **Committees** (roster = 4):
  - DISEC (unchanged)
  - UNHRC (unchanged)
  - EU Council **→ Lok Sabha** (code LS, Indian Parliament, "Lok Sabha")
  - JCC **→ CCC** = **Continuous Crisis Committee** (went online on 2026-09-22; confirmed full form: Continuous Crisis Committee)
- **Board (lib/config/board.ts)**: "Marketing Head / Rithvik Dosapati" → **"Under-Secretary-General, Marketing / Atiksh"**.
- Deployment: Netlify, site id `8bf4f6a7-4c41-4d6e-aeed-4083b2764d11`, account `IMUN_TECH` (id `6aae48f9a10b67aac791452e`), repo `Will-Herondale/imun-website` branch `main`. Netlify API token lives in Netlify CLI config on this machine (see below).
- Netlify env vars currently set (2026-09-22): ADMIN_PASSWORD, ADMIN_SESSION_SECRET, FAMGATEWAY_API_KEY (fam_027a01b5c6479538ef00a0496e397bdb1eecae56), NETLIFY_DATABASE_URL (neon postgres), NEXT_PUBLIC_SITE_URL, **REGISTRATION_OPEN=false** (→ flip to true), **SITE_MAINTENANCE=false** (already off), ADMIN_EMAIL.
- Netlify API base: `https://api.netlify.com/api/v1`. Sites env GET is `GET /sites/{site_id}/env`. Env vars are managed at account level: `PUT /accounts/{account_id}/env/{key}?site_id={site_id}` (account id `6aae48f9a10b67aac791452e`).
- Local dev: `npm run dev`, preview was PID 11704 on `http://192.168.1.12:3000` (may be stale). Tests: 57 passed. Build: `npm run build` / `npm run build:netlify`.

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
- imunindia.com reportedly blocked by Fortinet firewall. Root cause check: DNS resolves (A → 75.2.60.5, Netlify), site 200, HTTPS + strict CSP, no malware indicators. FortiGuard's public URL lookup returns 403 to automated requests, so the block is most plausibly **FortiGuard categorising imunindia.com as "Unrated"/"Newly Registered" (or a stale category)** — FortiGate policies default-block unrated domains.

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