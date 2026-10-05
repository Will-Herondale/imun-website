# IMUN 2026 website — handover pack

Written for the MUN founder / head. No technical background assumed.
Two parts: **Part A is what you need to read. Part B is only needed if you ever move or rebuild the site.**

---

## Part A — What you are being handed over

A finished, working delegate-registration website for IMUN 2026.

| | |
|---|---|
| Live address | **https://imunindia.com** |
| What it does | Shows the conference info, takes delegate registrations, takes payment, emails nothing (the site is the record of who registered), and has a private admin page with the delegate list. |
| Cost to run | A hosting bill + a database bill, renewed monthly (see "The part that is not yours yet" below). |
| Who built it | Ashwath (previous web & tech coordinator). |

### The one-page summary of how registration works

1. A delegate fills the form and clicks **Pay ₹500 & register**.
2. The site saves their answers, then sends them to a payment page (FamGateway) where they pay ₹500 by UPI.
3. When the payment provider confirms the money arrived, the site creates the registration automatically and emails nothing — the delegate lands back on the site with a "Registration received" panel.
4. If they close the tab after paying, their answers are already saved and the site finalises their seat when they come back.
5. You see everyone in **/admin**, and can download the whole list as a spreadsheet (CSV).

**There is no way for someone to register without actually paying.** A delegate cannot type their own UTR and take a seat — this was fixed on 4 Oct 2026 and verified live.

### Things you should know on day one

- **Registrations currently close to your UPI wallet**, which is the previous coordinator's personal Fam wallet. See "Money and payments" below — decide this before you start taking money from delegates.
- **The database is a private Neon account** created by the previous coordinator. You have no login to it yet.
- **The code is on a private GitHub repo** owned by the previous coordinator's personal account.
- **Nothing is backed up anywhere you control.** If the hosting account is deleted and not replaced, the website stops existing. There is no second copy running.

---

## The part that is not yours yet (read this carefully)

The previous coordinator is **keeping the domain name and the hosting bill in their name**. That was the decision, and it is fine contractually — but it means:

> **The website only exists while someone pays for hosting.** If the hosting is switched off and the domain is released, imunindia.com goes offline and stops taking registrations. The code alone is not a website.

So before the conference you need a decision, in writing, between:

- **(A) Continue the arrangement** — the previous coordinator keeps hosting under their name, and handles any outage. You need a written agreement: who they are, what they do, what it costs, and the date it ends. Risk: if they are unreachable during the conference, nobody can fix the site.
- **(B) Move it into the MUN's name (recommended)** — the MUN opens its own hosting + domain + database accounts and pays them. One-time setup cost, then it is yours and nobody else's. You only need one afternoon plus a card.
- **(C) Move it after the conference** — fine, but write down the exact date, because option (A) drifting is the common failure.

Whichever you pick: **make sure the final decision is made at least two weeks before the conference**, not the week of it.

---

## Money and payments — decide this before you take any registrations

**Current situation:** delegates pay through FamGateway, a payment page. That provider sends the money directly into a **personal UPI wallet belonging to the previous coordinator** (`nathan.hamilton@fam`, which is printed on the registration page). The provider's account, the merchant account and the money are all in their name.

**What that means for you:**
- Money from your delegates goes into someone else's personal wallet, not the MUN's account.
- You cannot see the provider dashboard, so you cannot check whether a payment landed or refund a delegate yourself.
- The list of delegates *is* visible to you on the website admin page, and that part works regardless.

**To make it yours (recommended, and it is not hard):**

1. The founder creates a free FamGateway account in the MUN's name (MUN email, MUN's UPI ID).
2. The previous coordinator signs in once and swaps the payment key to the MUN's account.
3. The personal UPI ID is removed from the registration page.
4. Delegate fees then land in the MUN's own account and the MUN holds the receipts.

If you decide to keep option (A), then at minimum write down: who collects the money, how often it is passed to the MUN, and how a delegate gets a refund.

---

## Day-of checklist

The morning of the conference, with a phone and Wi-Fi:

1. Open **https://imunindia.com** — does the homepage load?
2. Open **https://imunindia.com/registration** — does the registration page load?
3. Open **https://imunindia.com/admin** — log in and check the delegate count looks right.
4. Download the delegate list: on the admin page use **Export CSV**, save it to a laptop *and* email it to yourself. That spreadsheet is your backup.
5. Do **one** real ₹500 test payment end to end (or have someone do it) and confirm it shows up in the delegate list. Do this *before* the conference, not during.
6. Screenshot the homepage, the fee table and the delegate count for your records.

**If the site is down during the conference:** call the previous coordinator first. If the site is down, nothing can be fixed by editing text — it is a hosting/internet problem, and it is the previous coordinator's account.

---

## Who to contact

| Role | Name | For |
|---|---|---|
| Previous web & tech coordinator | Ashwath | Anything broken, anything about hosting, the database, the code, or a payment that looks wrong. |
| MUN founder / head | *(you)* | Everything else. |
| Payment provider support | FamGateway, from the account email | Payment itself declined, refund, amount wrong. |

---

## Part B — Technical appendix (only if the site ever needs to move or be rebuilt)

Everything below is for whoever ends up doing the work. It is complete: with these items you can stand the site up anywhere.

### Accounts and credentials to transfer

Fill this in as you go. Do not fill in secrets in a shared doc — store them in a password manager shared only between the outgoing and incoming owners.

| # | Item | Belongs to now | Transferred? | Date |
|---|---|---|---|---|
| 1 | Domain name (registrar) | previous coordinator | ☐ | |
| 2 | Website hosting account (Azure App Service `imunindia-2026`, resource group `Pulse`) | previous coordinator | ☐ | |
| 3 | Database (Neon project `ep-muddy-dream-az54zxs7-c-3`, db `neondb`) | previous coordinator | ☐ | |
| 4 | Code repo (`github.com/Will-Herondale/imun-website`) | previous coordinator | ☐ | |
| 5 | Payment provider merchant account (FamGateway) | previous coordinator | ☐ | |
| 6 | Admin login (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) | previous coordinator | ☐ | |
| 7 | Azure Table storage account (used when no database is configured) | previous coordinator | ☐ | |
| 8 | Data export (admin page → Export CSV) | — | ☐ | |

### Settings the site needs (all of these, no exceptions)

| Setting | What it does | Where to put it |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | The public address, e.g. `https://imunindia.com` | hosting environment settings |
| `REGISTRATION_OPEN` | `true` = accept registrations, `false` = registration page says closed | hosting environment settings |
| `SITE_MAINTENANCE` | `true` = whole site shows "down for maintenance" | hosting environment settings |
| `FAMGATEWAY_API_KEY` | Payment provider key. Also used to **verify webhook signatures** — payments cannot be confirmed without it | hosting environment settings (secret) |
| `NETLIFY_DATABASE_URL` | Postgres connection string for registrations | hosting environment settings (secret) |
| `ADMIN_EMAIL` | Email of the admin login | hosting environment settings (secret) |
| `ADMIN_PASSWORD` | Admin password | hosting environment settings (secret) |
| `ADMIN_SESSION_SECRET` | Long random string that keeps admin sessions signed | hosting environment settings (secret) |

`FAMGATEWAY_API_KEY` and the database URL must **not** be emailed or pasted into a document. `.env.example` lists the supported names.

### How the site is built (for the next technical owner)

- Next.js app, TypeScript, server-rendered. Requires a **Node.js server**, not a static file host — a "drag and drop" host will not work.
- **Database:** Postgres. Production runs on Neon. Fallback is an Azure Storage table, which holds less data.
- **Check before deploying anything:**
  ```bash
  npm ci
  npm run typecheck     # must be silent
  npm run lint          # must be silent
  npm test              # must be 110 passed / 9 skipped
  ```
  There is also an optional test against a real database:
  ```bash
  RUN_DB_INTEGRATION=1 npm test
  ```
- **Build and deploy** (current method, Azure):
  ```bash
  npm run build:standalone          # produces deploy-artifact/iemun-standalone.zip
  az webapp deploy --resource-group Pulse --name imunindia-2026 \
    --src-path deploy-artifact/iemun-standalone.zip --type zip --clean true --restart true
  ```
- **Deploying somewhere else** (e.g. any Node host): `npm ci && npm run build`, then start the built server. Set runtime Node 24 (or 22+).
- **Edit the site content** (dates, fees, committees, FAQ, the wallet ID, board members) — all of it is plain text in these files, no programming needed:
  - `lib/config/site.ts` — dates, fee, venue, "how to pay" wording, contact details, capacity
  - `lib/config/committees.ts` — the committees and capacities
  - `lib/config/board.ts` — the board/organisers
  - `lib/config/faq.ts` — the questions and answers
  - `lib/config/content.ts` — homepage and page copy
- **After any content edit** you must rebuild and redeploy (commands above), or the change will not appear. There is no separate admin editor for text.
- **There is an admin page** for registrations (`/admin`), committee allocation, and payment reconciliation — but it does not edit page text.

### Rules that must not be broken

These are the security rules the site depends on. A future maintainer who removes any of them re-opens the payment hole that was closed on 4 Oct 2026:

1. **A registration is created only from a payment the server verified with the payment provider.** No self-reported UTR, no manual override, no "trust me" path.
2. **Never put a secret in a file that gets committed.** `.env.local` is gitignored; `.env.example` is a template of names only.
3. **Never email or paste secrets into chat, documents or screenshots.** Rotate a key immediately if one is exposed — it is in git history if it was committed.
4. **Keep the webhook signature check.** It is what proves a payment callback is genuine.

### Historical context (why the code looks like this)

- **3 Oct 2026:** the secretariat reported 3 paid delegates missing from the admin list. Cause: the site only saved anything at the very end, so a delegate who paid but never finished the form was lost. Fixed by saving the form answers *before* payment (4 Oct, commit `ae93b5d`).
- **4 Oct 2026:** the form also accepted a typed UTR with no payment check — anyone could claim a seat. Now closed: only a verified payment works (commit `edf5fc3`, live-verified).
- **3 Oct 2026:** refunds for the 3 lost delegates were completed manually by the user. All records from that episode were deleted.
- Neon paid tiers are exhausted, so the site stores data in Postgres instead of the original Azure Tables.

### Data you must not lose

The delegate list is the MUN's only record of who paid and who is coming. It is worth more than the code.

- Export it from the admin page (Export CSV) after every registration day and after the event.
- If the site is ever offline, the list can still be read out of the database — the previous coordinator can run one SQL query against it and hand over a CSV.
- If a delegate asks "did my registration go through?", check the admin page; a paid registration with a green confirmation panel is a completed registration.