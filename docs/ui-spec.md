# UI Specification: Bank Branch Queue System

**Version 1.0 - 2026-11-06** - added in Issue #7 (F-01)
**Reference implementation:** `apps/web/src/app/login/page.tsx` and `apps/web/src/components/icons.tsx`
**Related:** `docs/system-sds.md` section 4 (screens, shared behavior), feature contracts in `docs/sprints/sprint-N/` (per-screen states and messages)

This document is the visual and interaction baseline for every screen. The system SDS says **what** each screen does; feature contracts say **which** states and messages a screen has; this spec says **how it looks and behaves**. New screens (F-02 `/queues`, `/my-ticket`; F-03 `/operator`; S2 `/board`) follow it. Any change to a token or component here goes through a reviewed docs change, like the contracts.

---

## 1. Design principles

1. **Calm and readable.** Warm neutral background, white cards, one dark accent. Customers at a branch read their ticket from a distance; operators work fast.
2. **One primary action per view.** It is the dark button. Everything else is secondary.
3. **Bilingual where it matters.** Headings and buttons in English; explanations and every error message also in Thai (`lib/errors.ts`).
4. **Honest UI.** Show only what the product does. No links or buttons for out-of-scope features (registration, password reset, social login, payments: SRS D-10).
5. **Hidden is not secure.** Role-based navigation and disabled buttons are UX only; the API enforces everything (SDS 5).

## 2. Design tokens

All tokens are Tailwind classes (Tailwind 3, default palette). Use these, not ad-hoc colors.

### 2.1 Color

| Token | Tailwind | Hex | Use |
|---|---|---|---|
| Page background | `bg-[#f2f1ec]` | #f2f1ec | Behind cards on full-page screens |
| Surface | `bg-white` | #ffffff | Cards, panels, header |
| Subtle surface | `bg-stone-50` / `bg-stone-100/80` | #fafaf9 / #f5f5f4 | Inputs, info chips, table stripes |
| Text primary | `text-stone-900` | #1c1917 | Headings, values, primary button background |
| Text secondary | `text-stone-600` | #57534e | Body copy, labels |
| Text muted | `text-stone-400` / `text-stone-500` | #a8a29e / #78716c | Hints, Thai sub-lines, footers, placeholders |
| Border | `border-stone-200` / `border-stone-300` | #e7e5e4 / #d6d3d1 | Card edges, dividers, input underline |
| Primary | `bg-stone-900`, hover `bg-stone-800` | #1c1917 | Primary button, brand mark, icon tiles |
| Accent | `text-amber-500` | #f59e0b | Decorative highlight only (wave icon). Never for status or errors |
| Danger | `bg-red-50` `border-red-200` `text-red-700` | | Error alerts |
| Success (reserved) | `bg-emerald-50` `border-emerald-200` `text-emerald-700` | | Success notices (e.g. "Ticket completed") |
| Info (reserved) | `bg-sky-50` `border-sky-200` `text-sky-700` | | Neutral notices |

**Status colors** (ticket badges, from S1; S2/S3 statuses included so later sprints stay consistent):

| Status | Badge classes | EN | TH |
|---|---|---|---|
| WAITING | `bg-stone-100 text-stone-700` | Waiting | รอเรียก |
| CALLED | `bg-amber-100 text-amber-800` | Called | ถึงคิวแล้ว |
| SERVING | `bg-sky-100 text-sky-800` | Being served | กำลังให้บริการ |
| COMPLETED | `bg-emerald-100 text-emerald-800` | Completed | เสร็จสิ้น |
| CANCELLED (S2) | `bg-stone-100 text-stone-500 line-through` | Cancelled | ยกเลิกแล้ว |
| NO_SHOW (S2) | `bg-red-100 text-red-700` | No-show | ไม่มาตามเรียก |
| EXPIRED (S2) | `bg-stone-100 text-stone-500` | Expired | หมดอายุ |
| PRIORITY lane (S3) | `bg-violet-100 text-violet-800` | Priority | คิวผู้สูงอายุ |

Badge shape: `rounded-full px-2.5 py-0.5 text-xs font-medium`. A badge always shows text, never color alone.

### 2.2 Typography

| Token | Classes | Use |
|---|---|---|
| Font family | `font-sans` (system UI stack; Segoe UI on Windows) | All screens. Set on the page root |
| Display | `text-5xl font-bold leading-[1.1] tracking-tight` | Brand panel headline; ticket number on `/my-ticket` |
| H1 page title | `text-2xl font-bold tracking-tight text-stone-900` | One per screen ("Welcome back!", "Service queues") |
| H2 section | `text-lg font-semibold text-stone-900` | Card titles |
| Body | `text-[15px] leading-relaxed text-stone-600` or `text-sm` | Paragraphs |
| Label | `text-xs font-medium text-stone-600` | Form labels, table headers |
| Caption | `text-xs text-stone-400` / `text-stone-500` | Hints, Thai sub-lines, footers |
| Overline | `text-xs font-medium uppercase tracking-wider text-stone-400` | "NOW SERVING", small section labels |
| Numbers | add `tabular-nums` | Ticket numbers, counts, times |

### 2.3 Spacing, radius, shadow

| Token | Value |
|---|---|
| Page padding | `p-4 sm:p-8` |
| Card padding | `p-6 sm:p-12` (large panels), `p-5` (small cards) |
| Vertical rhythm | `space-y-5` between form fields; `mt-7`/`mt-8` before primary actions |
| Radius | card `rounded-2xl`; button, alert, chip `rounded-lg`/`rounded-xl`; input `rounded-t-md`; badge `rounded-full` |
| Card shadow | `shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]` |
| Panel divider shadow | `md:shadow-[-24px_0_40px_-32px_rgba(0,0,0,0.25)]` (right panel of a split card) |
| Max widths | split card `max-w-5xl`; content pages `max-w-3xl`; forms `max-w-sm` |

## 3. Iconography

- **Source:** inline SVG components in `apps/web/src/components/icons.tsx`. No icon library and no emoji in the UI.
- **Style:** 24x24 viewBox, outline, `stroke="currentColor"`, `strokeWidth` 1.75 (1.5 for large decorative icons), round caps and joins. Color comes from the parent text color.
- **Sizes:** 16 inline with captions, 18 inside inputs and buttons, 20-22 in tiles, 30-52 decorative/brand.
- **Accessibility:** icons are `aria-hidden` by default. An icon-only button needs an `aria-label` (see 4.3).
- **Adding an icon:** add a new component to `icons.tsx` using the shared `Icon` wrapper, keep the same stroke style, and name it `<Thing>Icon`.

| Component | Meaning / where |
|---|---|
| `TicketIcon` | Brand mark; queue ticket |
| `UserIcon` | Username field, profile |
| `LockIcon` | Password field |
| `EyeIcon` / `EyeOffIcon` | Show / hide password |
| `ArrowRightIcon` | Primary action that moves forward (Sign in, Join) |
| `AlertCircleIcon` | Error alert |
| `SpinnerIcon` | Loading inside a button |
| `ShieldCheckIcon` | Trust / account notes |
| `ClockIcon` | Waiting, now serving, times |
| `WaveIcon` | Greeting (decorative, accent color) |

## 4. Components

Build new screens from these patterns. Copy the classes from the reference implementation.

### 4.1 Brand mark
Dark rounded tile with the ticket icon: `flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-white` + `<TicketIcon size={30} />`. Small form (headers, mobile): `<TicketIcon size={22} />` next to the product name in `text-lg font-bold tracking-tight`.

### 4.2 Split card (full-page entry screens)
Used by `/login`; reuse for any future full-page entry screen.

```
+--------------------------------------------------------------+
| [brand mark]                    | Bank Branch Queue          |
|                                 |                            |
| Hello                           | Welcome back!              |
| Branch Queue! (wave)            | Sign in ... / Thai line    |
|                                 |                            |
| Body copy EN                    | Username [icon|________]   |
| Body copy TH (muted)            | Password [icon|_____|eye]  |
|                                 | [ error alert ]            |
| [clock] NOW SERVING D001 | ...  | [ Sign in  -> ]            |
|                                 | (shield) account note      |
| (c) footer                      |                            |
+--------------------------------------------------------------+
```

- Grid: `grid md:grid-cols-[1.15fr_1fr]`, card per 2.3.
- Left (brand) panel: `hidden md:flex flex-col justify-between p-12 lg:p-16`. Decorative only; no actions.
- Right (form) panel: `px-6 py-10 sm:px-12 md:py-16 md:border-l` + panel divider shadow.
- Below `md` (768px) only the form panel shows, with the small brand mark.

### 4.3 Text input with icon
```tsx
<label htmlFor="username" className="mb-1.5 block text-xs font-medium text-stone-600">Username</label>
<div className="relative">
  <UserIcon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
  <input id="username" className="block w-full rounded-t-md border-0 border-b border-stone-300 bg-stone-100/80
    py-3 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400
    focus:border-stone-900 focus:bg-stone-100 focus:outline-none focus:ring-0 transition-colors" />
</div>
```
- Always a visible `<label htmlFor>`; the placeholder is an example, not the label.
- Password fields add a trailing show/hide button (`absolute right-2`, `aria-pressed`, `aria-controls`). Its `aria-label` must **not** contain the field's label word ("Show characters" / "Hide characters"), so `getByLabel('Password')` stays unique in tests.
- Forms use `noValidate` and validate in code, so the message comes from `lib/errors.ts` in both languages.

### 4.4 Buttons
| Variant | Classes | Use |
|---|---|---|
| Primary | `flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-70 disabled:cursor-not-allowed` | One per view: Sign in, Join, Call next, Start, Complete |
| Secondary | `rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50` | Logout, Retry, Cancel ticket (S2) |
| Icon-only | `rounded-md p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700` + `aria-label` | Show/hide password, refresh |

All buttons: `focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2`.
Loading: disable the button and swap the label for `<SpinnerIcon /> Signing in...` (present tense + "...").

### 4.5 Alerts
Error: `role="alert"` + `flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700`, `<AlertCircleIcon size={18} />`, English line in `font-medium`, Thai line in `text-red-600/80`. Give it a `data-testid` (e.g. `login-error`) because Next.js also renders a hidden `role="alert"` route announcer.
Success and info alerts use the same shape with the reserved colors from 2.1.

### 4.6 Info chip / ticket card
`inline-flex items-center gap-4 rounded-xl border border-stone-200 bg-stone-50 px-5 py-4`, an icon tile (`h-11 w-11 rounded-lg bg-stone-900 text-white`), an overline label and a `text-2xl font-bold tabular-nums` value, optional dashed divider `border-l border-dashed border-stone-300`. This is the base for the ticket on `/my-ticket` and the current-entry card on `/operator`.

### 4.7 Header (signed-in pages)
White bar, `border-b border-stone-200 px-6 py-3`: small brand mark + product name left; display name, role badge (`rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600`) and a secondary Logout button right. Keeps `data-testid="current-user"`.

## 5. Screen states (every screen)

Matches SDS 4.2. Messages always come from `lib/errors.ts` (EN + TH).

| State | Pattern |
|---|---|
| Loading | First load: muted "Loading..." line or skeleton blocks (`animate-pulse rounded-lg bg-stone-100`). Actions: button spinner (4.4). Polling refreshes silently. |
| Empty | Centered card: icon tile, `text-lg font-semibold` title, muted one-line hint, optional secondary button (e.g. "You have no ticket today." -> "Take a number"). |
| Error | Alert (4.5) + Retry secondary button. Keep showing the last good data when a refresh fails. |
| Success | Data shown; after a rejected action the screen stays usable. |

## 6. Layout templates for upcoming screens

Templates, not final designs; feature contracts define the content. All use page background + content width `max-w-3xl` under the header (4.7).

| Screen | Feature | Layout |
|---|---|---|
| `/queues` | F-02 (#9) | H1 "Service queues" + Thai sub-line; one white card per queue (`rounded-xl border border-stone-200 p-5`): name, code, Open/Closed badge, "N waiting" with `ClockIcon`, primary **Join** button (disabled when closed) |
| `/my-ticket` | F-02 (#9) | One large ticket card per entry: overline queue name, display number in Display style, status badge (2.1), "People ahead: N"; empty state per 5 |
| `/operator` | F-03 (#10) | Two columns on `md+`: left assigned-queue list with waiting counts and **Call next**; right current-entry card (4.6) with **Start** or **Complete** as the primary button |
| `/board` | F-06 (S2) | Full-screen, no header; very large `tabular-nums` numbers per queue; no names (NFR-05) |

## 7. Responsive rules

| Breakpoint | Behavior |
|---|---|
| < 768px (`md`) | Single column; split-card brand panel hidden; full-width buttons; page padding `p-4` |
| >= 768px | Split card and two-column layouts appear |
| Any | No horizontal scroll at 375px width; touch targets at least 40px high |

## 8. Accessibility checklist

- Every input has a visible `<label htmlFor>`; every icon-only button has an `aria-label`.
- Focus is always visible (`focus-visible:ring-2 ring-stone-900`).
- Errors use `role="alert"`; status is never shown by color alone.
- Text contrast: primary and secondary text on white/stone-50 meet WCAG AA; do not put `stone-400` text on `stone-100`.
- Decorative icons are `aria-hidden`; decorative panels contain no interactive elements.

## 9. Copy rules

- English UI text in sentence case; Thai line as a muted sub-line or the second line of an alert.
- Button labels are verbs: "Sign in", "Join", "Call next", "Start", "Complete", "Logout".
- Error messages: what happened + what to do, from `lib/errors.ts` only. Never show raw codes, stack traces or server text.
- Never show real personal data; demo data is synthetic.

## 10. Alignment status

| Item | Status |
|---|---|
| `/login` | Follows this spec (reference implementation) |
| `AppHeader`, `(app)/layout.tsx`, placeholder pages | Still use the earlier `slate` look; align to 4.7 when F-02 (#9) / F-03 (#10) build those pages |
| `globals.css` body font (`Arial`) | Pages set `font-sans` on their root; switch the global font when the remaining pages are aligned |

## 11. Version history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-11-06 | WATHITx | Initial spec extracted from the redesigned login page (Issue #7) |
