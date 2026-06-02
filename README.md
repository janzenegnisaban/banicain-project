# B-SAFE — Barangay Secure And Fast Engagement

**Community incident reporting and case management for Brgy. Banicain, Olongapo City, Zambales.**

This document serves as a **user manual for demos and presentations**, plus a short technical reference for developers.

---

## Table of Contents

1. [What is B-SAFE?](#1-what-is-b-safe)
2. [Demo Setup (Presenters)](#2-demo-setup-presenters)
3. [Demo Login Accounts](#3-demo-login-accounts)
4. [User Manual — Residents](#4-user-manual--residents)
5. [User Manual — Barangay Officials](#5-user-manual--barangay-officials)
6. [Incident Report Lifecycle](#6-incident-report-lifecycle)
7. [QR Code Access](#7-qr-code-access)
8. [Roles & Permissions](#8-roles--permissions)
9. [Presentation Script (Suggested Flow)](#9-presentation-script-suggested-flow)
10. [Testing Status](#10-testing-status)
11. [Developer Reference](#11-developer-reference)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. What is B-SAFE?

B-SAFE helps **residents** report incidents (theft, disputes, accidents, etc.) and lets **barangay officials** review, confirm, investigate, and update cases — with optional photo/video evidence.

| Audience | What they can do |
|----------|------------------|
| **Residents (guest or signed-in)** | Submit incident reports, attach evidence, track status when logged in |
| **Barangay officials** | View all reports, confirm submissions, add progress updates, manage cases |
| **Administrators / Barangay Captain** | Everything above + user management |

---

## 2. Demo Setup (Presenters)

### Start the application

```sh
npm install
npm run dev
```

Open: **http://localhost:3000**

> The dev server runs on port **3000** (not 5173).

### Environment (Supabase)

Create a `.env` file with your Supabase project keys:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Reset demo accounts (optional)

If test logins fail, recreate all role accounts:

```
GET http://localhost:3000/api/seed/accounts
```

Or open that URL in the browser while the dev server is running.

---

## 3. Demo Login Accounts

Use these accounts during your presentation. **For development/demo only — do not use in production.**

| Role | Email | Password | After login goes to |
|------|-------|----------|---------------------|
| **Resident** | `resident@bsafe.local` | `ResidentSecure!1` | `/residents/dashboard` |
| **Barangay Captain** | `captain@bsafe.local` | `CaptainSecure!1` | `/dashboard` |
| **Administrator** | `admin@bsafe.local` | `AdminSecure!1` | `/dashboard` |
| **Police Chief** | `chief@bsafe.local` | `ChiefSecure!1` | `/dashboard` |
| **Crime Analyst** | `analyst@bsafe.local` | `AnalystSecure!1` | `/dashboard` |
| **Police Officer** | `officer1@bsafe.local` | `OfficerSecure!1` | `/dashboard` |

### Login URLs

| User type | URL |
|-----------|-----|
| Resident | http://localhost:3000/login?role=resident |
| Official | http://localhost:3000/login?role=officer |

---

## 4. User Manual — Residents

### 4.1 Guest reporting (no account)

1. Go to **http://localhost:3000** → click **Get Started** → choose **Resident**  
   **Or** scan/open **http://localhost:3000/qr**
2. You land on **Submit Incident Report** (`/residents`).
3. A banner shows: *“Reporting as guest”* — the report can be submitted but **cannot be tracked later** without an account.

### 4.2 Three-step report form

| Step | Section | What to fill in |
|------|---------|-----------------|
| **1** | Your information | Name, mobile number, location (quick-select or type address in Brgy. Banicain) |
| **2** | Incident details | Incident type, incident details, witness (optional), **official informed (yes/no)** |
| **3** | Notes & evidence | Required notes, optional photo/video attachments |

**Important fields:**

- **Incident type** — auto-suggests priority (e.g. Violence → Critical).
- **Did you already inform a barangay official?**
  - **Yes** → enter the official’s name (required).
  - **No** → report is treated as a first-time submission via B-SAFE.
- **Notes** — required for all submissions.

4. Click **Submit incident report**.
5. Success screen shows workflow steps: *Submitted → Confirmed → Investigating → Resolved*.

### 4.3 Signed-in resident (track reports)

1. Sign up or log in at `/login?role=resident`.
2. Submit reports at `/residents` — they link to your account.
3. Open **My Reports** at `/residents/dashboard` to:
   - See status and priority badges
   - View progress timeline
   - Read official progress updates

### 4.4 Tips for presenters

- Use a **Banicain address** (e.g. from the location dropdown) or validation will fail.
- Mobile number must be Philippine format: `09XXXXXXXXX` or `+639XXXXXXXXX`.
- Guest demo: submit once, then log in as an official to show the new **Pending Confirmation** report.

---

## 5. User Manual — Barangay Officials

After logging in at `/login?role=officer`, use the sidebar:

| Page | Purpose |
|------|---------|
| **Dashboard** | Overview, quick stats, recent activity |
| **Incident Reports** | Full list, filters, confirm/edit/delete cases |
| **Analytics** | Trends, incident types, PDF exports |
| **Users** | Manage accounts *(Administrator & Barangay Captain only)* |
| **Settings** | System preferences |

### 5.1 Review a resident submission

1. Go to **Incident Reports** (`/reports`).
2. Find a report with status **Pending Confirmation**.
3. Click to open the detail modal:
   - **Title** is shown first; reference ID is secondary.
   - **Resident Submission** panel shows reporter info, incident details, witness, and whether they already informed an official.
   - View attached photos/videos if any.

### 5.2 Confirm a report

1. In the detail modal, click **Confirm Report**.
2. Status changes from **Pending Confirmation** → **Open**.
3. A progress note is added automatically.

### 5.3 Add a progress report

1. Open a report that is **Open** or **Under Investigation**.
2. In the **Progress Reports** section:
   - Enter update details (required).
   - Optionally select **First Responder** (BPSO, BPOT, Rescue, etc.).
3. Click **Add progress report**.
4. Signed-in residents see these updates on their dashboard.

### 5.4 Edit a case

1. Click **Edit Case** in the modal (or from the list).
2. Update fields including **Respondents** and **Complainants** (at least one of each required when saving).
3. Save changes.

### 5.5 Analytics & exports

- Open **Analytics** for incident trends and type breakdown.
- Export **Analytical** or **Prediction** reports as PDF from the analytics page.

---

## 6. Incident Report Lifecycle

```
Resident submits
       ↓
Pending Confirmation  ←  Officials review resident submission
       ↓
      Open            ←  Official clicks "Confirm Report"
       ↓
Under Investigation ←  Officials add progress reports
       ↓
     Solved          ←  Case closed / resolved
```

Residents (signed-in) and officials both see this progression. Progress reports can include first-responder unit information.

---

## 7. QR Code Access

**URL:** http://localhost:3000/qr

- Displays a QR code linking to the resident incident form.
- No app install required — scan with a phone camera.
- Useful for posters at the barangay hall, covered court, or community areas.

---

## 8. Roles & Permissions

| Role | Submit reports | Track own reports | View all reports | Confirm / progress | Analytics | User management |
|------|:--------------:|:-----------------:|:----------------:|:------------------:|:---------:|:---------------:|
| Guest | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Resident | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Police Officer | ❌ | — | ✅ | ✅ | ✅ | ❌ |
| Crime Analyst | ❌ | — | ✅ | ✅ | ✅ | ❌ |
| Police Chief | ❌ | — | ✅ | ✅ | ✅ | ❌ |
| Administrator | ❌ | — | ✅ | ✅ | ✅ | ✅ |
| Barangay Captain | ❌ | — | ✅ | ✅ | ✅ | ✅ |

---

## 9. Presentation Script (Suggested Flow)

**Duration: ~10–15 minutes**

1. **Introduction (1 min)** — Landing page: explain B-SAFE purpose for Brgy. Banicain.
2. **QR access (1 min)** — Show `/qr`; scan or click through to resident form.
3. **Guest report (3 min)** — Submit a sample incident as guest; highlight 3-step form and official-informed question.
4. **Official review (3 min)** — Log in as `officer1@bsafe.local`; open **Incident Reports**; confirm the submission.
5. **Progress update (2 min)** — Add a progress report with first-responder unit.
6. **Resident tracking (2 min)** — Log in as `resident@bsafe.local`; show `/residents/dashboard` with timeline.
7. **Analytics (2 min)** — Open `/analytics`; show incident trends and PDF export.
8. **Admin (optional)** — Log in as `captain@bsafe.local`; briefly show **Users** page.

---

## 10. Testing Status

Last verified: **June 2026**

| Check | Result |
|-------|--------|
| `npm run check` (TypeScript / Svelte) | ✅ 0 errors |
| `npm run build` | ✅ Success |
| All main routes (HTTP 200) | ✅ Pass |
| API: unauthenticated `/api/reports` | ✅ 403 (expected) |
| API: guest incident submit | ✅ 201 Created |
| API: seed all demo accounts | ✅ 6 roles |
| Supabase: resident login | ✅ Pass |
| Supabase: officer login + fetch reports | ✅ Pass |
| Resident auth isolation (403 for wrong reporter) | ✅ Pass |
| Vitest unit tests (`npm run test`) | ✅ 2/2 passed (server + browser) |

---

## 11. Developer Reference

### Key routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/qr` | QR code for resident portal |
| `/residents` | Incident report form |
| `/residents/dashboard` | Resident report tracker |
| `/login`, `/signup` | Authentication |
| `/dashboard` | Official overview |
| `/reports` | Incident reports management |
| `/analytics` | Analytics & PDF exports |
| `/users` | User administration |

### API endpoints

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/reports` | Officials only |
| GET | `/api/reports?reporterId=…` | Own reports or officials |
| POST | `/api/reports` | Residents/guests (structured metadata) or officials |
| PUT | `/api/reports?id=…` | Officials only |
| DELETE | `/api/reports?id=…` | Officials only |
| GET | `/api/seed/accounts` | Recreate demo users (dev) |

### Tech stack

- SvelteKit + TypeScript + Tailwind CSS
- Supabase Auth + PostgreSQL
- jsPDF for analytics exports

### Project structure

```
src/
  routes/           # Pages and API
  lib/
    components/     # UI (AppBar, Sidebar, FormSection, etc.)
    constants/      # Barangay locations, labels, roles
    server/         # Supabase, report repository
    utils/          # Auth, report parsing
docs/
  REVISION-CHECKLIST.md   # Feature revision tracker
```

---

## 12. Troubleshooting

| Problem | Solution |
|---------|----------|
| Login fails for demo accounts | Visit `http://localhost:3000/api/seed/accounts` to recreate users |
| Guest report returns error | Ensure Supabase is configured; `reporter_id` must allow NULL for guests |
| Official pages redirect to login | Use `/login?role=officer` and an official demo account |
| Address validation error | Include **Banicain** and **Olongapo** in the address |
| Port already in use | Stop other processes or check `vite.config` for port 3000 |
| Vitest fails with Playwright error | Run `npx playwright install` |

---

## Support & Documentation

- **Revision checklist:** `docs/REVISION-CHECKLIST.md`
- **Supabase setup:** `SUPABASE_SETUP.md`

For thesis demos, keep the dev server running and use the demo accounts in [Section 3](#3-demo-login-accounts).
