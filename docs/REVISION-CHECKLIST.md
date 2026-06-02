# B-SAFE Master Revision Checklist

Tracking document aligned with beneficiary consultation.  
**Status key:** Done | Partial | Planned | Docs only

---

## Terminology & Documentation

| # | Revision | Status | Notes / Location |
|---|----------|--------|------------------|
| 1 | Revise Project Title | Planned | Update landing hero, `+layout.svelte` title, thesis docs |
| 2 | Consultation with Project Beneficiary | Docs only | Process item — document sign-off in thesis Chapter 1 |
| 3 | Clarify “One” & “Incident” usage | Partial | **B-SAFE** = *Barangay Secure And Fast Engagement* (not “One”). Use **Incident** for reports; avoid “crime” in user-facing text |
| 4 | Crime → Incident | **Done** | Sidebar, reports, analytics UI + PDF export strings updated |
| 5 | Suspect → Respondents | Partial | UI labels via `LABELS` in `src/lib/constants/barangay.ts`; DB field `suspects` unchanged |
| 6 | Victim → Complainants | Partial | Same as respondents |

---

## System Features & Access

| # | Revision | Status | Notes / Location |
|---|----------|--------|------------------|
| 7 | Guest Login | **Done** | `/residents` without sign-in; guest banner + optional account |
| 8 | Super Admin (Barangay Captain) | Partial | Role `Barangay Captain` added; same privileges as Administrator |
| 9 | Responsiveness | Partial | Tailwind responsive layouts; full mobile QA still needed |
| 10 | Accessible through QR code | **Done** | `/qr` page with QR image + link to `/residents` |
| 11 | Respondents & complainants required | Partial | Required on reports edit; dashboard edit pending |
| 12 | Priority based on incidence (automatic) | **Done** | `autoPriorityForIncidentType()` on resident submit |
| 13 | Notes field required (when logged in) | **Done** | Required on resident report form for all submissions |

---

## Reports & Analytics

| # | Revision | Status | Notes / Location |
|---|----------|--------|------------------|
| 14 | Prediction Report | Partial | Analytics section renamed; export PDF includes predictions |
| 15 | Analytics / Analytical Report | Partial | Section headers updated in analytics page |
| 16 | Action taken → Progress Report | **Done** | Progress report form + timeline in reports modal |
| 17 | Respondent record | Partial | Form fields labeled Respondents; `ResidentSubmissionPanel` in modal |
| 18 | Report ID → Report Title (display) | **Done** | Title first, ref ID secondary in lists/modals |

---

## Barangay & Community Context

| # | Revision | Status | Notes / Location |
|---|----------|--------|------------------|
| 19 | List of Parks and Streets | **Done** | `BANICAIN_LOCATIONS` in `src/lib/constants/barangay.ts` |
| 20 | Add Priority Options | **Done** | Low / Medium / High / Critical |
| 21 | Barangay Decision Logo / Population Logo | Planned | Add assets to `static/` + footer/header when files provided |
| 22 | Insert incident details | **Done** | Resident form field → stored in report metadata |
| 23 | Insert name of officials (tutorials) | **Done** | Field: *Name of barangay official informed* |
| 24 | Insert name of witness | **Done** | Witness name field on resident form |
| 25 | Action taken + first responder (BPSO/BPOT/Rescue) | **Done** | `FIRST_RESPONDER_UNITS` dropdown on progress report form |

---

## UI components (workflow pass)

- `FormSection.svelte` — 3-step resident form sections
- `PriorityBadge.svelte` — auto-priority preview + report cards
- `IncidentWorkflowSteps.svelte` — resident success + dashboard tracking
- `ResidentSubmissionPanel.svelte` — structured resident metadata in official modal

## Testing (2026-06-02)

| Check | Result |
|-------|--------|
| `npm run check` | 0 errors |
| Routes `/`, `/qr`, `/residents`, `/login`, `/dashboard`, `/reports`, `/analytics` | HTTP 200 |
| `GET /api/reports` without auth | 403 (expected) |
| `POST /api/reports` guest with metadata | 201 after `reporter_id` nullable migration |
| Guest DB constraint | Fixed via `2026-06-02-allow-null-reporter-id.sql` |

---

- `src/lib/constants/barangay.ts` — terminology, locations, roles, auto-priority
- `src/lib/utils/reportParsing.ts` — extended resident metadata
- `src/routes/residents/+page.svelte` — new fields, auto priority
- `src/routes/qr/+page.svelte` — QR access
- Role updates in `src/lib/types/user.ts`, login, users, sidebar

---

## Still needs beneficiary input

1. Final **project title** wording  
2. **Barangay Decision** and **Population** logo image files  
3. Confirm if “tutorials” meant **barangay officials** or **tutorial/training** names  
4. Complete list of **parks/streets** if more than seeded defaults  

---

## Suggested next sprint

1. Full terminology pass on `dashboard`, `reports`, `analytics` PDF export  
2. Official form validation (respondents + complainants required)  
3. Progress report modal with first-responder fields  
4. Mobile responsiveness audit  
5. Supabase migration for first-class columns (witness, first_responder) if required for reporting  
