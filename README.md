# B-SAFE – Barangay Secure And Fast Engagement

Modern SvelteKit platform that helps Barangay East Bajac-Bajac residents submit incident reports and allows local officials to triage, investigate, and communicate outcomes in real time. This README is written for incoming contributors so you can understand the moving parts before touching code.

---

## 1. Product Overview

- **Audience**  
  - Residents submit reports, upload evidence, and track progress.  
  - Officials (admin, police, analysts) manage workload, monitor analytics, and coordinate responses.

- **Core Pillars**  
  - **Frictionless intake** via public-facing landing, signup, login, and resident portal.  
  - **Command center** for officials: dashboard, reports, analytics, team, and settings.  
  - **Realtime awareness** powered by server-sent events (SSE) and animated UI cues.  
  - **Trust & transparency** with clear progress indicators, status modals, and notifications.

- **Tech Stack**  
  - SvelteKit + Vite + TypeScript
  - TailwindCSS for styling, DaisyUI-inspired components
  - Supabase client bootstrap (optional integrations)
  - In-memory stores for reports & verification (swap with DB in production)

---

## 2. Quick Start

```sh
npm install          # grab dependencies
npm run dev          # start SvelteKit dev server on http://localhost:5173
npm run test         # run Vitest UI specs (see src/routes/page.svelte.spec.ts)
npm run build        # create production bundle
npm run preview      # preview built app locally
```

Environment variables: none required for the demo in-memory mode. When wiring real email/Supabase adapters, create a `.env` (see `svelte.config.js` for adapter hooks).

---

## 3. Project Structure (what you will touch most)

```
src/
  routes/              # SvelteKit pages & API endpoints
    +page.svelte       # Landing page & role chooser modal
    login/, signup/    # Auth flows (password + Gmail OTP)
    residents/         # Resident incident form + autosave
    dashboard/         # Official portal (tabs + modals)
    analytics/, reports/, users/, settings/  # supporting views
    api/               # JSON + SSE endpoints (reports + auth)
  lib/
    components/        # Shared UI (Sidebar, charts, modals)
    server/            # In-memory stores (reports, verification)
    supabaseClient.ts  # placeholder client config
static/                # logos, favicons
prisma/                # schema placeholder (future DB hookup)
```

---

## 4. Application Walkthrough

| Route | Audience | Highlights |
| --- | --- | --- |
| `/` (Landing) | Public | Animated hero, feature cards, About/How/Benefits sections, CTA triggering **Role Chooser Modal** to jump into resident or official flows. |
| `/signup` | Residents & officers | Toggle between roles and between Gmail OTP signup (calls `/api/auth/send-code` + `/api/auth/verify-code`) or password signup (localStorage). Success redirects to `/residents` or `/dashboard`. |
| `/login` | Residents & officers | Role toggle, credential validation (demo accounts for officials, localStorage for residents). On success, writes `localStorage.user` and routes to `/dashboard` or `/residents`. |
| `/residents` | Residents | Form for report metadata, attachments preview, autosave to `localStorage`, and submission confirmation flow showing a mini status tracker (Seen → Processing → Done). |
| `/dashboard` | Officials | Sidebar layout with tabs (Overview, Reports, Analytics, Team, Settings). Integrates live data via `/api/reports` + `/api/reports/stream`. Offers CRUD modals and status insights. |
| `/reports` | Officials | Dedicated list/detail tooling (mirrors dashboard report tab but with more screen real estate). |
| `/analytics` | Officials | Advanced insights view with KPI cards, trend placeholders, predictive insights, hot spots, and suggested actions. |
| `/users`, `/settings` | Officials | Placeholder admin pages describing configuration patterns and future hooks. |

---

## 5. Popups, Modals & Secondary Flows

| Popup / Modal | Trigger | Purpose |
| --- | --- | --- |
| **Role Chooser Modal** (`src/routes/+page.svelte`) | Landing page "Get Started" CTA | Lets visitors jump into Resident report or Official login flows without leaving hero section. |
| **Gmail Verification Flow** (`signup`) | Gmail signup path | Sends OTP via `/api/auth/send-code`, captures 6-digit code, verifies with `/api/auth/verify-code`, then stores session in `localStorage`. |
| **Resident Submission Confirmation** (`residents`) | After report submit | Replaces form with status tracker, CTA to file another or jump to dashboard. |
| **Create Report Modal** (`dashboard`) | Officials click "Create Report" | Collects case metadata and POSTs to `/api/reports`. |
| **View Report Modal** (`dashboard`) | "View details" icon | Read-only case summary with timeline of updates. |
| **Edit Report Modal** (`dashboard`) | "Edit" icon or from view modal | Prefills form, allows updates via PUT `/api/reports?id=...`. |
| **Delete Confirmation Modal** (`dashboard`) | "Delete" icon | Hard confirmation before calling DELETE `/api/reports?id=...`. |
| **Crime History Modal** (`lib/components/CrimeHistoryModal.svelte`) | Reusable for analytics/report pages | Shows historical stats table with month-over-month deltas. Integrate via `show` prop. |
| **Loading/Feedback overlays** | Login, signup, resident submit | Provide `isLoading` and `isSubmitting` animations, error toasts, and success banners. |

When building new features, align with the existing modal conventions: backdrop blur, `PageTransition`, accessibility labels, and `transition:fade/scale` pairs for polished UX.

---

## 6. Data & API Contracts

### Reports API (`src/routes/api/reports`)
- **GET** `/api/reports` – returns `{ reports: Report[] }` from in-memory store (seeded with demo data).  
- **POST** `/api/reports` – accepts partial payload, server fills metadata (ID `CR-YYYY-MM-XXXX`, timestamps, initial update).  
- **PUT** `/api/reports?id=CR-...` – merges updates, appends audit log entry with timestamp + note.  
- **DELETE** `/api/reports?id=CR-...` – removes report, notifies subscribers.
- **SSE** `/api/reports/stream` – `text/event-stream` pushing init snapshot plus `created | updated | deleted` events. Dashboard subscribes using `EventSource`.

> Replace `$lib/server/reportsStore.ts` with a real database + queue when graduating from demo mode. The current setup is single-process only.

### Auth API (`src/routes/api/auth`)
- `send-code`: Validates Gmail address, generates 6-digit code, stores it in `verificationStore`, simulates email send (log).  
- `verify-code`: Confirms stored code, returns `user` object with derived role.  
- Storage is **in-memory** for now; use Redis or Prisma for production.

---

## 7. Client-Side State & Auth Notes

- Sessions are stored in `localStorage.user` with `{ username, role, isAuthenticated }`.  
- Guards: Dashboard `onMount` ensures only official roles (Administrator, Police Officer, Police Chief, Crime Analyst). Residents are redirected to `/residents`, everyone else to `/login`.  
- Signup/login flows also persist demo users to `localStorage.users`. For production, integrate Supabase or another auth provider.

---

## 8. UI Components Worth Knowing

- `Sidebar.svelte` – navigation + responsive drawer shared by official pages.
- `ActionCard.svelte`, `DashboardCard.svelte`, `StatCard.svelte`, `TransactionTable.svelte` – building blocks for cards & lists.
- `LineChart` & `BarChart` placeholders – ready for chart libraries (currently static scaffolding).
- `PageTransition.svelte` – wrap every routed page for consistent enter animations.
- `LoadingIndicator.svelte` – spinner overlay used during async actions.
- `CrimeHistoryModal.svelte` – drop-in modal for analytics history views.

When adding new UI, keep the gradient/blur aesthetic consistent and reuse PageTransition & Tailwind tokens already defined in `app.css`/`tailwind.config.js`.

---

## 9. Developer Workflow & Expectations

- **Code Style**: TypeScript everywhere, prefer explicit interfaces (see `Report` type). Use Tailwind utility classes; avoid large bespoke CSS unless scoped.
- **State Management**: Keep it local within Svelte components or use `$lib/server` stores for shared data. Avoid adding global stores until necessary.
- **Testing**: `src/routes/page.svelte.spec.ts` shows how to test Svelte pages with Vitest + Testing Library. Mirror that when adding regression coverage.
- **Accessibility**: All modals already include `role="dialog"`, `aria-labelledby`, ESC close, and focusable buttons. Maintain those patterns.
- **Deployment**: Currently adapter-agnostic. To deploy, install the appropriate adapter (`@sveltejs/adapter-node`, etc.) in `svelte.config.js`.

---

## 10. Future Enhancements (Backlog for new devs)

- Replace in-memory stores with Prisma/PostgreSQL (see `prisma/schema.prisma` placeholder).  
- Wire Supabase auth/storage for OTP and attachments.  
- Integrate actual video background and media uploads (S3/GCS).  
- Implement role-based navigation (hide analytics for residents).  
- Automate email/SMS via real provider (SendGrid/Twilio).  
- Add push notifications / FCM for resolved reports.  
- Harden tests around report CRUD and SSE reconnect logic.

---

## 11. Support

If you join mid-sprint:
1. Review feature tickets in the backlog and map to the sections above.
2. Shadow an existing teammate for one deploy cycle.
3. Keep README updates in your PR if you change flows, routes, or APIs.

Welcome aboard, and help us keep Barangay Banicain safe. 💙
