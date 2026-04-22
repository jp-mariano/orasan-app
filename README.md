# Orasan — Time tracking for freelancers

**Orasan** is a Filipino word for “clock.” This app helps freelancers and teams manage **projects** and **tasks**, track time with **timers and work sessions**, and (on **Pro**) create **invoices** with PDF export. Authentication uses **Supabase** (OAuth: GitHub, Google), billing uses **Freemius** for Pro tier.

- **Public pages in the app:** `GET /privacy`, `GET /terms`, `GET /license` (see `src/app/privacy`, `src/app/terms`, `src/app/license`)

## What’s in the product

- **Time tracking** — Start, pause, resume, and stop timers per task; project-level batch pause/stop where supported.
- **Projects & tasks** — CRUD, hourly/fixed rates (project and task), task status (e.g. completed for invoicing).
- **Work sessions** — Group work into sessions for reporting and control.
- **Invoices (Pro)** — Create invoices from **stopped** time on **completed** tasks in a date range, preview, line items, tax rate, **PDF** download; list/detail and status updates on Pro.
- **Data export** — User-initiated export of projects, time data, and optional activity log (where implemented).
- **Account deletion** — Request and confirm deletion with gating (e.g. active subscription / Freemius checks); commerce (portal, checkout) blocked while deletion is in progress.
- **User & business profile** — Display name, business fields for invoices; **Freemius Customer Portal** and checkout for Pro.
- **Free vs Pro** — See **Subscription** below; enforcement is in `src/lib/subscription-enforcement.ts`.
- **Security** — **Row-level security (RLS)** in PostgreSQL/Supabase so each user can only access their own data in normal operation.

**Connectivity:** v1 is **online-first**—sign-in, data, and billing expect a working internet connection. The timer UI may use short-lived **browser state** for responsiveness; the **database** remains the source of truth.

## Roadmap (not in v1)

- **Deeper offline / background sync** — use when disconnected, then reconcile when back online. Planned; not part of the first release.

## Subscription (Free vs Pro)

- **Pro** — Full project, task, and time-entry writes on allowed projects; **create and manage invoices** (create, update status, delete) and use invoice preview.
- **Free — project limit** — With **at most two** active (non-completed) projects, **all** of them are writable. With **more than two** active projects, only the **two newest** (by `created_at`) stay writable; **older** active projects are **read-only** (view and history; **delete project** may still be allowed; other writes blocked).
- **Free — invoices** — View lists, open details, and **download PDFs**. **Creating** or **changing** invoices (including Pro-only mutations) requires Pro.
- **Free — timers on read-only projects** — You cannot start, resume, pause, or stop timers on read-only projects. If a timer is still running or paused when a project becomes read-only, the app may **stop** those sessions and show a short notice.

Server rules live in `src/lib/subscription-enforcement.ts` (e.g. `assertProjectWritableOrThrow`, `invoiceMutationAllowedForTier`).

## Tech stack

- **Framework** — Next.js 15 (App Router), TypeScript, React 19
- **Database & auth** — Supabase (PostgreSQL, RLS, Auth)
- **Subscriptions & checkout** — Freemius (SDK + webhooks, Customer Portal, checkout API routes)
- **UI** — shadcn/ui, Tailwind CSS v4, Lucide icons
- **Email** — Resend for transactional email
- **Quality** — ESLint, Lefthook (pre-commit), Prettier

## Getting started (development)

### Prerequisites

- Node.js 18+
- A Supabase project
- (Optional) Freemius product keys and webhook secret for Pro billing in dev/staging

### Install

```bash
git clone git@github.com:jp-mariano/orasan-app.git
cd orasan-app
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, etc.
# For Freemius: FREEMIUS_* and NEXT_PUBLIC_APP_URL as needed
```

### Database

Run `database/schema.sql` in the Supabase SQL editor (or your migration pipeline) to create tables and RLS policies.

### Run

```bash
npm run dev
```

Open the app and sign in. Use `npm run lint` and `npm run build` before shipping changes.

## Project structure (selected)

```
src/
├── app/                 # App Router: pages, API routes, auth, dashboard, webhooks
├── components/          # App UI: invoices, tasks, projects, modals, etc.
├── contexts/            # React contexts (auth, time tracking, work sessions, …)
├── hooks/               # Custom hooks
├── lib/                 # Business logic, Supabase clients, Freemius, invoices, RLS helpers
└── types/               # TypeScript types

database/
└── schema.sql

react-starter/          # Freemius checkout / portal UI kit (embedded in app)
```

## Legal & repository

- **App routes:** [`/privacy`](./src/app/privacy/page.tsx), [`/terms`](./src/app/terms/page.tsx), [`/license`](./src/app/license/page.tsx)
- **Home footer — source code link (optional):** set `NEXT_PUBLIC_APP_REPOSITORY_URL` to your public GitHub (or other) repo URL to show a **Source code** link on the marketing home page.
- **Operator contact (your deployment):** set optional `NEXT_PUBLIC_OPERATOR_LEGAL_NAME`, `NEXT_PUBLIC_OPERATOR_CONTACT_EMAIL`, and/or `NEXT_PUBLIC_OPERATOR_SUPPORT_URL` in `.env.local` (see `.env.local.example`). These appear on the legal pages; if unset, a short fallback explains that self-hosters should contact their admin.
- **Source license:** this repository’s `LICENSE` file (MIT) governs the **code**; hosted service terms are separate—see the Terms of Service page in your deployment.

## License

The Orasan **source code** in this repository is licensed under the **MIT License** — see the [LICENSE](LICENSE) file.
