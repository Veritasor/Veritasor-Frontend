# Data Export & Downloads UX

Design spec for the data-export experience: format selection, scope, progress,
and a downloads tray for past exports. The guiding principle is **users should
never wonder where an export went** — every export is visible, its status is
always legible, and completion is announced.

Implementation: `src/components/data-export/DataExportPanel.tsx`
(types in `exportTypes.ts`). Intended to surface on the Attestations page
(`src/pages/Attestations.tsx`) and any list view that supports export.

## 1. Flow

1. **Pick a format** — CSV, JSON, or PDF (radio cards, one selected by default).
2. **Pick a scope** — All / Current filter / Last 30 days (select).
3. **Generate** — the job starts in the background; the user can keep working.
4. **Track** — a determinate progress bar shows preparation; the downloads tray
   holds every job.
5. **Download** — when ready, a Download button appears in the tray. Past exports
   remain re-downloadable until they expire.

## 2. Formats

| Format | Extension | When to use |
|--------|-----------|-------------|
| CSV    | `.csv`    | Spreadsheets (Excel, Google Sheets). |
| JSON   | `.json`   | Structured records with full metadata, for developers. |
| PDF    | `.pdf`    | Formatted report for sharing and audits. |

## 3. Status surface & badges

Each tray item shows a status badge plus supporting copy:

| Status      | Badge      | Color token   | Supporting copy |
|-------------|------------|---------------|-----------------|
| `queued`    | Queued     | `--muted`     | "Waiting to start" |
| `processing`| Preparing  | `--accent`    | "Preparing… N%" + progress bar |
| `ready`     | Ready      | `--success`   | "{size} · Expires in N days" |
| `failed`    | Failed     | `--danger`    | error reason + **Retry** |
| `expired`   | Expired    | `--warning`   | "File expired — generate a fresh export" + **Regenerate** |

Status is never conveyed by color alone — each badge has a text label and
distinct supporting copy (WCAG 1.4.1 Use of Color).

## 4. Expiry copy

- Ready files show **"Expires in N days"** (falls back to hours under a day).
- After retention, the file becomes **`expired`**: "File expired — generate a
  fresh export", with a **Regenerate** action.
- Default retention assumption: **7 days** (adjust to match the backend policy).

## 5. Accessibility (WCAG 2.1 AA)

- **Live announcements** — a single `role="status" aria-live="polite"
  aria-atomic="true"` region (visually `.sr-only`) announces:
  - start: "Preparing CSV export. We'll let you know when it's ready."
  - completion: "CSV export ready to download."
  - download/regenerate actions.
  Polite (not assertive) so it never interrupts the user (WCAG 4.1.3 Status
  Messages). This matches the pattern in `AttestationProgress.tsx`.
- **Progress** — determinate `role="progressbar"` with `aria-valuenow/min/max`
  and `aria-labelledby` pointing at the job label.
- **Format picker** — a `<fieldset>`/`<legend>` radio group; each option is a
  `<label>` wrapping a native `<input type="radio">` (keyboard + SR friendly).
- **Scope** — native `<select>` with an associated `<label htmlFor>`.
- **Touch targets** — buttons/inputs use `min-height: var(--density-touch-min)`
  (44px, WCAG 2.5.5).
- **Focus** — relies on the global `:focus-visible` ring; no `outline: none`.

## 6. Responsive

- Format cards use `flex: 1 1 200px` and wrap to a single column on narrow
  viewports; scope select is capped at `max-width: 360px`.
- Tray rows reflow: label/badge and copy/actions each wrap independently.
- All spacing uses density tokens (`--density-*`) so the panel respects the
  comfortable/compact density mode.

## 7. Edge cases

- **Large exports** — work is backgrounded; the tray + polite announcement mean
  the user is told when a long-running export is ready without blocking the UI.
- **Failure** — `failed` status keeps the job in the tray with a Retry action;
  the reason is shown as text, not just color.
- **Expiry** — expired files cannot be downloaded; Regenerate restarts the job.
- **Mobile / screen readers** — see §5; announcements are polite and the tray is
  a labelled `region`.
- **Multiple exports** — newest job is prepended; each has independent progress.

## 8. Validation checklist

- `npm run lint` and `npm test` (`src/test/data-export.test.tsx`).
- axe: 0 violations for `aria-*`, `label`, `region`, `color-contrast`.
- Keyboard: Tab to format radios → arrow to choose → Tab to scope → Generate →
  Tab to Download when ready.
- Screen reader: confirm "Preparing…" and "ready to download" are announced
  once each, politely.

## 9. Screenshots

> _Before/after and axe screenshots to be attached in the PR_
> (`docs/uiux/screenshots/data-export-*.png`). The repo stores UI screenshots
> under `docs/uiux/screenshots/`.
