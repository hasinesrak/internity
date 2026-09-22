# Design System

Product name: **InternFlow**

InternFlow's interface is assembled from three layers that already exist in this repo: shadcn-style components built on Base UI primitives in `packages/ui`, beUI components copied in as source, and screen composition in `apps/web`. This document defines the color scheme, typography, icons, motion, and component inventory so every dashboard screen reads as one product.

Companion document: `docs/dashboard-design.md` defines the dashboard shell and the per-role layouts.

## Foundation Stack

| Layer | Choice | Lives in |
| --- | --- | --- |
| Styling | Tailwind CSS v4 | `packages/ui/src/styles/globals.css` |
| Tokens | shadcn semantic variables in oklch, `baseColor: neutral` | `packages/ui/src/styles/globals.css` |
| Primitives | Base UI (`@base-ui/react`) wrapped in shadcn-style components | `packages/ui/src/components/` |
| Motion components | beUI (`@beui/*` registry items, installed as source) | `packages/ui/src/components/` |
| Animation | `motion` (Motion for React) | workspace dependency |
| Icons | Phosphor Icons, duotone weight (`@phosphor-icons/react`) | workspace dependency |
| Type | Manrope Variable (`@fontsource-variable/manrope`) | `packages/ui/src/styles/globals.css` |
| Helpers | `cn`, `class-variance-authority` | `packages/ui` |
| Component config | shadcn `components.json` (`style: base-rhea`, `iconLibrary: phosphor`) | `packages/ui/components.json` |

Standing rules:

- beUI ships no runtime package and no brand palette. Its source calls shadcn semantic color utilities, so it inherits the InternFlow theme with no change. Do not introduce beUI-specific color variables.
- shadcn and Base UI own form controls, layout, and structural components. beUI owns motion and composed blocks. Do not hand-roll a motion widget that a beUI install slug already covers.
- One icon library per surface (Phosphor) and one animation library per surface (`motion`).

## Color Scheme

The beUI default scheme is the shadcn semantic token set below. It is defined once in `packages/ui/src/styles/globals.css`, mapped through `@theme inline` to Tailwind color names. Every component, including installed beUI source, must reference tokens (`bg-muted`, `text-foreground`, `ring-ring`) and never raw hex or oklch values.

### Tokens

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Page canvas |
| `foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Body text |
| `card` / `card-foreground` | `oklch(1 0 0)` / `oklch(0.145 0 0)` | `oklch(0.205 0 0)` / `oklch(0.985 0 0)` | KPI cards, panels, table surfaces |
| `popover` / `popover-foreground` | `oklch(1 0 0)` / `oklch(0.145 0 0)` | `oklch(0.205 0 0)` / `oklch(0.985 0 0)` | Menus, popovers, tooltips |
| `primary` / `primary-foreground` | `oklch(0.488 0.243 264.376)` / `oklch(0.97 0.014 254.604)` | `oklch(0.424 0.199 265.638)` / `oklch(0.97 0.014 254.604)` | Primary actions, active nav, links |
| `secondary` / `secondary-foreground` | `oklch(0.967 0.001 286.375)` / `oklch(0.21 0.006 285.885)` | `oklch(0.274 0.006 286.033)` / `oklch(0.985 0 0)` | Secondary buttons, quiet controls |
| `muted` / `muted-foreground` | `oklch(0.97 0 0)` / `oklch(0.556 0 0)` | `oklch(0.269 0 0)` / `oklch(0.708 0 0)` | Hover fills, placeholders, meta text |
| `accent` / `accent-foreground` | `oklch(0.488 0.243 264.376)` / `oklch(0.97 0.014 254.604)` | `oklch(0.424 0.199 265.638)` / `oklch(0.97 0.014 254.604)` | Selection, drop targets |
| `destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | Errors, destructive actions |
| `border` / `input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)`, `oklch(1 0 0 / 15%)` | Structure, field outlines |
| `ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` | Focus rings |
| `chart-1` … `chart-5` | `oklch(0.809 …)` … `oklch(0.424 …)` | same ramp | Data visualization only |
| `sidebar-*` | `oklch(0.985 …)` family | `oklch(0.205 …)` family | Dashboard shell sidebar |

### Usage rules

- No new hues. The palette is neutral surfaces plus one primary and one destructive. Positive and active states use `primary`; attention and failure use `destructive`.
- Status is never color alone. A status pairs a token color with a label, and usually an icon.
- Status tone mapping for `AnimatedBadge` and table cells:

| Status | Tone | Token |
| --- | --- | --- |
| Active, Published, Reviewed | positive | `primary` |
| Pending, Not Submitted, Draft | neutral | `muted` / `muted-foreground` |
| Needs Changes, Suspended, Expired | attention | `destructive` |
| Archived, Closed, Revoked | quiet | `muted` at reduced opacity |

- Charts read the `chart-1` … `chart-5` ramp in order. Never color a chart with `primary` outside that ramp.
- Dark mode is the same tokens under `.dark`. Switching themes suppresses all transitions for one frame, then restores them, so the flip snaps instead of smearing.

### Radius and surfaces

`--radius` is `0.45rem`; Tailwind steps derive from it (`sm` ×0.6 … `4xl` ×2.6). Radius is concentric: an outer radius equals the inner radius plus the padding between them. A `rounded-2xl` panel holding a `rounded-xl` list inside `p-1.5` is correct; two mismatched radii stacked is not.

Where a border exists only to create depth, use layered transparent `box-shadow` instead. Keep borders that communicate structure or state: dividers, field outlines, selected and focus states.

## Typography

- One family: Manrope Variable (`font-sans`, aliased to `--font-heading`).
- Scale: `text-xs` (12) meta and table cells, `text-sm` (14) default UI, `text-base` (16) section titles, `text-xl`/`text-2xl` page titles and KPI values.
- Numbers in tables, scores, and KPI values use tabular figures so columns align.
- Text hierarchy comes from size and `muted-foreground`, not from multiple weights or colors.

## Icons

- One set: Phosphor Icons at the **duotone** weight (`@phosphor-icons/react`). Never mix weights or sets on one surface.
- Icons inherit `currentColor`. Hover, active, and disabled states come from CSS color and opacity; never swap in a second asset per state.
- Size map: `size-3` inside `xs` controls, `size-4` default (buttons, table rows, nav), `size-5` section headers and empty states.
- Match optical weight to the adjacent text. Duotone is our single weight, so keep the pairing consistent: `size-4` beside `text-sm`.
- beUI source imports `lucide-react`. At install time every lucide import is replaced with its Phosphor duotone equivalent in a single reviewed pass, and the `lucide-react` dependency is dropped. Common substitutions:

| Lucide (in beUI source) | Phosphor duotone |
| --- | --- |
| `Folder`, `FolderOpen` | `Folder`, `FolderOpen` |
| `FileText` | `FileText` |
| `Bookmark` | `BookmarkSimple` |
| `MoreHorizontal` | `DotsThreeOutline` |
| `Pencil` | `PencilSimple` |
| `ArrowUp`, `ArrowDown`, `Undo2` | `ArrowUp`, `ArrowDown`, `ArrowCounterClockwise` |
| `FolderInput` | `FolderSimple` |
| `Check`, `X`, `Loader2` | `Check`, `X`, `CircleNotch` |

- Product icons (duotone): `House` overview, `Users`/`UsersThree` people, `Buildings` departments, `EnvelopeSimple` invitations, `CalendarBlank` classes, `ClipboardText` assignments, `LinkSimple` submissions, `ChatsCircle` feedback, `GraduationCap` intern learning, `ChartLineUp` activity, `Gear` settings.

## Motion

Motion is feedback, not decoration. A professional dashboard is crisp and fast.

### Timing

| Element | Duration |
| --- | --- |
| Press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms, under 300ms for routine UI |

### Easing

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);    /* entering, exiting */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* moving across screen */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);  /* drawer and sheet slide */
```

Springs use `{ type: "spring", duration: 0.3, bounce: 0 }`. Bounce is `0` everywhere except playful mobile gestures. `ease-in` is never used on a UI element.

### Rules

- Buttons and pressable rows scale `0.96` on press, `160ms ease-out`. Nothing scales below `0.95`.
- Entries start at `opacity: 0` and `scale: 0.95`. Nothing animates in from `scale: 0`.
- Exits use a small fixed `translateY` and `ease-out`, softer than the enter.
- Animate `transform` and `opacity` only. `will-change` only on `transform`, `opacity`, `filter`.
- Keyboard-initiated, high-frequency actions (command palette open/close, arrow navigation) do not animate at all.
- Hover decoration (magnetic pull, tilt) is gated behind `useHoverCapable()`.
- Every animated state change also carries a static cue: color, icon, or label.
- Reduced motion: `useReducedMotion()` from `motion/react` replaces transform choreography with opacity pulses. Information is never carried by motion alone.
- Staged entrances stagger 30–80ms per chunk and never block interaction.

## Component Inventory

Installed beUI source lands in `packages/ui/src/components/` and is imported as named exports (`@workspace/ui/components/...`). Verify slugs against the live registry before installing: `https://beui.dev/r/registry.json`.

### Dashboard surfaces

| Surface | Install | Notes |
| --- | --- | --- |
| Dashboard navigation | `@beui/ai-sidebar` | Base of the dashboard shell, tweaked. See `docs/dashboard-design.md` |
| Command menu (⌘K) | `@beui/command-palette` | Fuzzy navigation and actions |
| Data tables | `@beui/table`, `@beui/table-async` | Rosters, submissions, invitations; `table-async` for server paging |
| Status badge | `@beui/animated-badge` | Every status chip in the app |
| KPI values | `@beui/animated-number` | Count-up on view inside shadcn cards |
| Detail drawer | `@beui/drawer` | Row detail and review panel on desktop |
| Bottom sheet | `@beui/bottom-sheet` | Same panels and mobile nav on small screens |
| Modals | `@beui/morphing-modal`, `@beui/center-morph-modal` | Invite dialog, editors, confirmations |
| Tabs | `@beui/tabs` | View and filter switches |
| Toasts | `@beui/animated-toast-stack` | All transient confirmations |
| Tooltip | `@beui/tooltip` | Icon-only controls |
| Row actions | `@beui/context-menu`, `@beui/overflow-actions` | Table row menus, action rails |
| Theme switch | `@beui/theme-toggle` | View-transition repaint; swaps `next-themes` for our theme store (see Install Procedure) |
| 404 | `@beui/not-found-glitch` | Replaces the root not-found stub |
| Loading | `@beui/loader` | Busy states and button spinners |
| Schedule detail | `@beui/bouncy-accordion` | Class agenda expand/collapse |
| Activity view | `@beui/heat-calendar` | Optional department activity graph |

### Forms

| Surface | Install |
| --- | --- |
| Text field | `@beui/input` |
| Select | `@beui/select` |
| Searchable select | `@beui/combobox` |
| Multi choice | `@beui/multi-select` |
| Checkbox / radio / switch | `@beui/checkbox`, `@beui/radio`, `@beui/switch` |
| Numeric entry (scores, rubric points) | `@beui/adaptive-stepper` |
| Primary button | `@beui/button-base` |
| Buttons with a lifecycle (draft, send, submit) | `@beui/button-stateful` |
| Destructive confirm (revoke, archive) | `@beui/hold-action-button` |
| Activation form | `@beui/signup-form` |
| Time entry on mobile | `@beui/wheel-picker` |

Calendar/date picking, text areas, cards, avatars, breadcrumbs, and skeletons come from shadcn components on Base UI primitives in `packages/ui/src/components/`.

### AI drafting surfaces

| Surface | Install |
| --- | --- |
| Draft status and trace | `@beui/agent-activity` |
| Thinking state | `@beui/thinking-shimmer` |
| Rubric plan preview | `@beui/todo-list` |
| Accept or discard a draft | `@beui/approval-card` |

## Install Procedure

```bash
cd packages/ui
pnpm dlx shadcn@latest add @beui/ai-sidebar
pnpm add motion clsx tailwind-merge
```

Then, in order:

1. Read every file the registry added, including `lib/ease.ts`, `lib/utils.ts`, and hooks. Keep them.
2. Replace lucide icon imports with Phosphor duotone equivalents and drop `lucide-react`.
3. Confirm the source uses only semantic color utilities (`background`, `foreground`, `muted`, `primary`, `ring`, …). If it hardcodes a color, map it to a token.
4. Compose with the named exports. Style through `className`; do not fork internals except where `docs/dashboard-design.md` lists an approved tweak.
5. Run `pnpm lint` and `pnpm typecheck` at the repo root.

Install commands run in `packages/ui`, where `components.json` lives. Its aliases map registry targets to `@workspace/ui/*`. Package versions stay one week behind (`minimumReleaseAge` in `pnpm-workspace.yaml`), so a brand-new registry dependency may need its publish date checked.

Dependency notes for this stack:

- `@beui/table` and `@beui/table-async` pull `@tanstack/react-virtual`; `@beui/code-block` family pulls `shiki`.
- `@beui/theme-toggle` imports `next-themes`. We are on TanStack Start, so the approved tweak is to read the theme class on `<html>` from our own Zustand store and keep the component's View Transition repaint. This is the second and last allowed source tweak after the `ai-sidebar` guard described in `docs/dashboard-design.md`.
- `lucide-react` never reaches the final bundle; every install pass replaces it with `@phosphor-icons/react`.

## Composition Rules

- Prefer installed beUI source over custom one-off motion widgets.
- Use `className` for layout and small styling changes. Preserve registry helpers (`@/lib/ease`, `@/lib/utils`, hooks).
- New motion around beUI components uses `useReducedMotion()` and animates `transform`/`opacity` only.
- A repeated workflow (invite an intern, review a submission) is composed from parts, not forked into a new widget.

## States And Feedback

Every data surface defines loading, empty, error, and success states.

- Loading: `@beui/table` skeleton rows for tables, `@beui/loader` for panels, `@beui/thinking-shimmer` while a draft generates.
- Empty: names the place, says how to fill it, offers one clear next action ("No assignments yet" → "Create assignment"). A search empty state names the query and offers "Clear filters".
- Error: states the fix beside the field that failed ("Choose a password with at least 8 characters"). No "Oops", no blame, no exclamation marks.
- Success: a toast confirms the completed action ("Invitation sent to sam@school.edu").

Buttons start with a verb naming the action: "Invite intern", "Publish assignment", "Save draft". Confirmations repeat the consequence on the confirm button ("Delete assignment", not "OK"). Labels use sentence case. Fields keep a visible label; placeholders show format only (`name@example.com`, `DD/MM/YYYY`).

## Accessibility

- Full keyboard support on every interactive surface: tab order, Enter/Space, Escape, and arrows in trees and menus. The beUI tree and menu primitives ship this; keep their ARIA roles when tweaking.
- Focus is visible everywhere: `ring-ring` at `2–3px`, never removed.
- Hit areas are at least 32px tall in dense tables, 36px in forms and nav rows.
- Text contrast meets AA against its surface in both themes.
- Status, errors, and results are announced with labels and live regions, not motion or color alone.
- `prefers-reduced-motion` is honored through `useReducedMotion()`.
