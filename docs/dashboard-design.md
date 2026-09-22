# Dashboard Design And Layouts

Product name: **InternFlow**

InternFlow is an operations dashboard. Every role signs in to the same shell and sees the work scoped to them. This document defines that shell, the navigation built on beUI's `ai-sidebar`, and the layout of every role's screens. Tokens, icons, motion, and the component inventory live in `docs/design-system.md`.

## Dashboard Shell

```text
┌───────────────────────────────────────────────────────────────┐
│ topbar: department switcher · ⌘K search · theme · user menu   │
├──────────────┬────────────────────────────────────────────────┤
│ sidebar      │ content                                        │
│ (ai-sidebar) │ ┌ page header: title · description · actions   │
│              │ ├ KPI row (cards with animated-number values)  │
│              │ └ panels: tables, lists, editors, drawers      │
│ overview     │                                                │
│ ▸ people     │                                                │
│ ▸ department │                                                │
│ ▸ classes    │                                                │
│ ⚑ pinned     │                                                │
│ settings     │                                                │
└──────────────┴────────────────────────────────────────────────┘
```

- Sidebar: 264px expanded, 64px collapsed icon rail. Persisted per user in a Zustand store.
- Topbar: 56px, sticky. Holds the department switcher (only when the user has more than one department), the ⌘K command entry, the theme toggle, and the user menu.
- Content: max width 1440px, `p-6` desktop, `p-4` mobile, 24px grid gap.
- KPI row: 4 columns desktop, 2 tablet, 1 mobile.
- Below 768px the sidebar becomes a `@beui/bottom-sheet` opened from the topbar; detail drawers become bottom sheets.

Route-level auth guards choose which shell nav a role receives. The backend still enforces every permission; nothing in the shell is a security control.

## Navigation: ai-sidebar, With Tweaks

The dashboard nav is beUI's `@beui/ai-sidebar` (`components/agents/ai-sidebar.tsx`) adapted from a workspace resource tree into a navigation tree. It already has what a dashboard nav needs: a keyboard-navigable tree with roving tabindex, expand/collapse with spring layout, overflow-safe labels, a row menu on `MorphPopover`, and a `group-data-[state=collapsed]/sidebar:hidden` hook that the collapsed rail uses.

### Item model

`SidebarResource` kinds map to navigation concepts:

| `kind` | Navigation meaning | Example |
| --- | --- | --- |
| `project` | Current context root | The active department |
| `folder` | Expandable group | Classes, Assignments, People |
| `file` | Destination route | `/instructor/assignments` |
| `bookmark` | Pinned shortcut | "Draft agenda for Thu class" |

Rows stay as `file` or `bookmark` leaves; only `folder` and `project` expand. `disabled` marks a destination the role cannot open yet, with the reason in its tooltip.

### Approved tweaks

1. **Icons.** Pass `renderIcon` returning Phosphor duotone icons from a single `nav-icons` map in `apps/web`. This replaces the lucide defaults without touching the component's internals.
2. **Row menu.** Pass `renderMenu` with navigation-context actions ("Pin", "Copy link", "Open class"). Drop "Rename" and the move commands; navigation items are not user-editable.
3. **No mutation.** Omit `onMove`, `onRename`, and `onItemsChange`. Guard `draggable` and the `F2` rename path in the installed source behind the presence of those callbacks, so a static nav gets no drag affordance and no rename input. This is the only source change allowed in `ai-sidebar`; everything else is composed around it.
4. **Routing.** `activeId` is controlled from the TanStack Router location; `onActiveChange` calls the router. The tree re-renders on navigation like any controlled list.
5. **Collapsed rail.** The shell toggles `data-state` on a `group/sidebar` container; expanded shows the tree, collapsed shows the same Phosphor icons in a rail with `@beui/tooltip` labels.

Keyboard support ships with the component and is kept as is: arrows move, `ArrowRight`/`ArrowLeft` expand and collapse, `Enter`/`Space` select, `Home`/`End` jump, `F2` and the context-menu key are inert once the mutation callbacks are gone.

### Nav trees by role

Shared leaf: `settings` at the bottom, pinned items (`bookmark`) at the top.

| Role | Tree |
| --- | --- |
| Admin | Overview · People (All users, HR accounts) · Departments (All, Overrides) · Activity · Settings |
| HR | Overview · Departments (All, Archived) · People (Directory) · Invitations (Pending, History) · Settings |
| Supervisor | Overview · Instructors · Department (Interns, Classes, Assignments, Submissions) · Drafts · Settings |
| Instructor | Overview · Classes (Upcoming, Past) · Assignments (Drafts, Published, Closed) · Submissions (To review, Reviewed) · Drafts · Settings |
| Intern | Overview · Classes (Upcoming, Past) · Assignments (Open, Submitted, Graded) · Feedback · Settings |

## Global Elements

- **Command menu.** `@beui/command-palette` on ⌘K/Ctrl+K. Commands: navigate to any destination the role has, create (invite intern, new assignment, new class), and search users and assignments. It opens and closes without animation; it is a high-frequency keyboard surface.
- **User menu.** Name, role badge (`@beui/animated-badge`), profile, settings, sign out. Phosphor `UserCircle` duotone avatar slot.
- **Theme.** `@beui/theme-toggle`, View Transition repaint, transitions suppressed during the swap.
- **Toasts.** `@beui/animated-toast-stack`, bottom-right desktop, top mobile. Every mutation confirms here with the exact object acted on ("Invitation sent to sam@school.edu").
- **Detail drawer.** `@beui/drawer` from the right on desktop for row detail and review; `@beui/bottom-sheet` on mobile.

## Page Anatomy

Every content page follows one template:

1. **Page header** — `text-xl` title, one-line `muted-foreground` description, primary action top-right (`button-base` or `button-stateful`).
2. **KPI row** (dashboards only) — shadcn `Card` with a Phosphor duotone icon, a `muted-foreground` label, and an `@beui/animated-number` value; optional delta in `chart-*`.
3. **Panels** — shadcn `Card` sections holding a beUI table, list, or editor. Two panels side by side on wide screens (`grid-cols-3`: 2fr list + 1fr context), stacked below.
4. **Overlays** — drawers, sheets, and modals own row detail and short forms so the list underneath stays put.

## Role Dashboards

### Admin

Home: KPI row (total users, HR accounts, departments, accounts pending activation), a `@beui/table` of recent signups, and a `@beui/heat-calendar` of platform activity.

| Screen | Layout | Components |
| --- | --- | --- |
| `/admin/users` | Filter tabs + dense table | `@beui/table`, `@beui/tabs`, `@beui/animated-badge`, `@beui/context-menu`, `@beui/drawer` |
| `/admin/hr` | Table with create action | `@beui/table`, `@beui/morphing-modal`, `@beui/button-stateful` |
| `/admin/departments` | Table + override drawer | `@beui/table`, `@beui/drawer`, `@beui/hold-action-button` (delete/merge) |
| `/admin/activity` | Chronological feed | shadcn list, `@beui/animated-badge` |

### HR

Home: KPI row (departments, interns active, invitations pending, invitations expiring), department table, and a pending invitations panel.

| Screen | Layout | Components |
| --- | --- | --- |
| `/hr/departments` | Table + archive action | `@beui/table`, `@beui/morphing-modal` (create/edit), `@beui/hold-action-button` (archive) |
| `/hr/invitations` | Tabs (Pending, History) + table | `@beui/tabs`, `@beui/table-async`, `@beui/animated-badge` |
| `/hr/invitations/new` | Modal form | `@beui/morphing-modal`, `@beui/combobox` (department), `@beui/input` (email), `@beui/button-stateful` (Send) |
| `/hr/directory` | Searchable table | `@beui/morphing-search` or `@beui/combobox`, `@beui/table` |

### Supervisor

Home: KPI row (instructors, interns, classes this week, submissions awaiting review), instructor roster, and department activity.

| Screen | Layout | Components |
| --- | --- | --- |
| `/supervisor/instructors` | Roster table + add/remove | `@beui/table`, `@beui/combobox`, `@beui/hold-action-button` (remove) |
| `/supervisor/drafts` | Draft list (assignments, rubrics, agendas) | `@beui/table`, `@beui/animated-badge`, `@beui/drawer` |
| Department views | Same as instructor, read plus draft rights | instructor screens below |

### Instructor

Home: KPI row (classes this week, published assignments, submissions to review, average score), the class schedule timeline, and the review queue.

| Screen | Layout | Components |
| --- | --- | --- |
| `/classes` | Timeline list, agenda accordion | shadcn `Card`, `@beui/bouncy-accordion`, `@beui/animated-badge`, `@beui/overflow-actions` |
| `/classes/new` | Scheduler form | `@beui/input`, shadcn textarea, shadcn calendar, `@beui/wheel-picker` (time, mobile), `@beui/button-stateful` (Draft with AI) |
| `/assignments` | Tabs (Drafts, Published, Closed) + table or cards | `@beui/tabs`, `@beui/table`, `@beui/animated-badge` |
| `/assignments/new` | Editor: title, instructions, rubric, deadline | `@beui/input`, shadcn textarea, rubric rows with `@beui/adaptive-stepper`, shadcn calendar, `@beui/button-stateful`, `@beui/agent-activity`, `@beui/approval-card` |
| `/submissions` | Review queue table | `@beui/table-async`, `@beui/animated-badge`, `@beui/context-menu` |
| `/submissions/:id` | Right drawer review | `@beui/drawer` / `@beui/bottom-sheet`, `@beui/adaptive-stepper` (score), shadcn textarea (feedback), `@beui/button-stateful` |

### Intern

Home: KPI row (open assignments, due this week, submitted, average score), next class card, and the assignment list.

| Screen | Layout | Components |
| --- | --- | --- |
| `/classes` | Upcoming and past schedule | shadcn `Card`, `@beui/bouncy-accordion`, `@beui/button-base` (Open meeting link) |
| `/assignments` | Status list (Open, Submitted, Graded) | `@beui/tabs`, `@beui/animated-badge`, `@beui/drawer` |
| `/assignments/:id` | Detail + submit form | `@beui/input` (submission URL), shadcn textarea (notes), `@beui/button-stateful` |
| `/settings` | Profile and password | `@beui/input`, `@beui/switch`, `@beui/button-stateful` |

## Key Flows

### AI assignment and agenda draft

The draft action sits beside the editor's own fields. `@beui/button-stateful` runs the lifecycle: idle "Draft with AI" → loading → success ("Draft ready") or error ("Unable to draft. Try again.").

While the request runs, `@beui/thinking-shimmer` names the step, and `@beui/agent-activity` shows what is being drafted (title, instructions, rubric criteria). When a draft returns, `@beui/approval-card` offers "Use draft" and "Discard"; `@beui/todo-list` previews the rubric criteria before they are applied. "Use draft" fills the editor fields and changes nothing else — the person still edits and saves or publishes through the normal action. A draft is never a saved assignment or class by itself.

### Submission review

Selecting a row opens `@beui/drawer` with the submission link, the intern's notes, the rubric, and the review form. Score uses `@beui/adaptive-stepper`; feedback is a shadcn textarea. "Save review" (`@beui/button-stateful`) toasts the result; "Request changes" sets `Needs Changes` with a `destructive`-toned badge. The table row updates in place.

### Invite an intern

`@beui/morphing-modal` with department (`@beui/combobox`) and email (`@beui/input`). "Send invitation" runs the button lifecycle and toasts the recipient address. Revoking an invitation is destructive: `@beui/hold-action-button`, held to confirm.

### Activation

`/activate` is a centered `@beui/signup-form` on the `background` canvas: name, password, confirm. The token comes from the emailed link and is never typed. Success routes to `/dashboard`; an expired token offers "Request a new link".

## States Matrix

| Surface | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| Table | `skeleton-rows` from `@beui/table` | Icon, name, next action ("No invitations yet" → "Invite intern") | Inline retry panel | Toast on mutation |
| Dashboard KPI | Muted placeholder blocks | `0` with a hint line | Panel-level retry | — |
| AI draft | `@beui/thinking-shimmer` + `@beui/agent-activity` | — | Calm inline message, form stays editable | `@beui/approval-card` |
| Forms | Button loading state | — | Field-level message with the fix | Toast + button success state |
| Schedule | Loader in card | "No classes scheduled" → "Schedule class" | Inline retry | Toast |

## Quality Rules

- Every control defines hover, focus, active, disabled, and loading. Press feedback is `scale(0.96)`.
- Tables keep tabular figures, sticky headers, and a 32px minimum row hit area.
- Drawer and sheet transitions use `--ease-drawer` under 300ms; entries fade and scale from `0.95`.
- Keyboard-first review: a reviewer moves the queue with arrows and saves with a shortcut; none of that animates.
- Copy follows `docs/design-system.md`: sentence case, verb-first buttons, errors that name the fix.
