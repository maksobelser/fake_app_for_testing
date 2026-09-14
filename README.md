# Loop — testing sandbox

A fictional project tracker for evaluating no-code testing tools. Plain HTML, CSS, and JavaScript; no database, backend, runtime dependencies, or external API calls.

**Demo login:** `demo@loop.test` / `Test123!`

## Run locally

Requires Node.js 20 or newer. No install step is needed.

```sh
npm start          # http://localhost:4173
npm run check     # syntax checks, automated model tests, static build
```

## Host on Render

Push this folder to your Git repository, then create a Render **Static Site**:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- No environment variables, database, or start command.

Alternatively, use the included `render.yaml` as a Render Blueprint. Hash routes (`#/tasks`, etc.) work without rewrite rules. See [Render’s static site documentation](https://render.com/docs/static-sites).

## Workflows to test

Start each independent run with **Reset demo data → Reset demo data** in the confirmation dialog. The seed contains **6 tasks: 2 To do, 2 In progress, 2 Done**. Reset keeps you signed in.

| Workflow | Steps and expected result |
| --- | --- |
| Login validation | Submit blank fields or an invalid email → field errors. Submit a wrong password → login error. Use demo credentials → Overview. Show/Hide toggles password visibility. |
| Session & logout | Reload while signed in → stay signed in. Sign out → login. Open `#/tasks` while signed out → login. Data survives logout. |
| Create task | New task → enter a name (3–80 characters), description, project → Continue → choose status, priority, assignee, optional date → Create task. First new task is `TSK-007`; total becomes 7. Back preserves input; Cancel or Escape creates nothing. |
| Search, filter & sort | All tasks → search `homepage` → 1 result. Combine Website launch + In progress → 2 seeded tasks. Search `zzzz` → empty state. Clear filters → all tasks. Sort by name, newest, or due date. |
| Edit & complete | Select a task name → edit both steps → Save changes. Changes persist after reload. Its checkmark changes status to Done; clicking again changes it to To do. Overview counts update. |
| Delete & cancel | Open a task → Delete task → Cancel retains it. Repeat and confirm → task disappears and total decreases. |
| Profile & preferences | Settings → change display name/role and toggle preferences → Save changes. Name and compact rows update; reload retains them. Blank name fails validation. Discard changes restores last saved values. |
| Reset | Change tasks/settings → Reset demo data → Cancel preserves changes. Confirm restores the original tasks, profile, preferences, activity, and next task ID. |

## Automation notes

- Prefer accessible labels and button names. Key actions also have `data-testid` attributes, including `login-email`, `login-password`, `login-submit`, `new-task`, `task-title`, `task-submit`, `task-search`, `status-filter`, `project-filter`, `task-sort`, `save-profile`, `confirm-delete`, and `confirm-reset`.
- Task selectors are predictable: `task-row-TSK-001`, `task-open-TSK-001`, and `task-complete-TSK-001`. IDs aren’t reused after deletion until reset.
- Login has a fixed 350 ms simulated loading state. Wait for the destination heading or result instead of using fixed sleeps. Success messages use `role="status"`; login errors use `role="alert"`. Dialogs support keyboard navigation and Escape.
- Form dates are optional; past dates are allowed. Seed dates are fixed in September 2026. Due-date sorting puts undated tasks last. Search covers task ID, name, description, and assignee.
- Data uses `localStorage["loop.demo.v1"]`; login uses `sessionStorage["loop.session.v1"]`. For a clean automated start, clear both keys and reload. Prefer a separate browser context per parallel run to avoid shared data. Settings affect the demo profile; task assignees remain a fixed list.
- This is simulated authentication: credentials and data are public client-side code. No real accounts, emails, or server-side access control. Data is local to each browser/origin. Blocked storage falls back to memory; malformed saved data resets to the seed.

Source: `public/`. Build output: `dist/`. Automated tests cover the data model; browser workflow tests are left for the tools you’re evaluating.
