# Requirements

Project name: **InternFlow**

This document captures the product requirements from the core intern management system plan.

## Scope

InternFlow is a lightweight management platform for:

- intern onboarding
- department scoping
- class scheduling
- assignment publishing
- submission review
- feedback and scoring

The system supports five roles:

- Admin
- HR
- Supervisor
- Instructor
- Intern

## Roles

### Admin

Can:

- create, deactivate, and manage HR accounts
- view, edit, or delete any user
- override, merge, or delete departments
- manage system-level configuration
- trigger password resets
- revoke access immediately
- view global platform activity and rosters

Cannot:

- submit intern tasks
- participate as an intern
- handle day-to-day grading

### HR

Can:

- create, view, edit, and archive departments
- assign and reassign supervisors
- assign instructors to departments
- send intern email invitations
- view organization-wide directories

Cannot:

- create or delete Admin accounts
- access system technical configuration
- create assignments
- evaluate submissions
- schedule or host classes
- submit intern tasks

### Supervisor

Can:

- add instructors to their assigned department
- remove instructors from their assigned department
- act as an instructor inside their assigned department
- schedule classes
- post assignments
- review intern submissions
- view interns, classes, and assignments in their department

Cannot:

- manage Admin or HR accounts
- create, delete, or rename departments
- assign supervisors to departments
- manage users outside their department
- send intern invitation emails

### Instructor

Can:

- schedule class sessions with meeting links and agendas
- create, view, update, and delete assignments for their department
- set deadlines and guidelines
- access intern submissions
- leave review scores and written feedback

Cannot:

- manage system settings
- manage HR accounts
- manage other instructors
- reassign users to departments
- invite new interns
- access assignments or submissions outside their department

### Intern

Can:

- activate account through email invitation
- set password
- access department dashboard
- view class schedules
- open meeting links
- view pending and completed assignments
- submit external task links with notes
- view review status, grades, and feedback

Cannot:

- access administrative views
- access other departments
- access other interns' submissions
- create or edit assignments
- create or edit classes
- invite users
- grant permissions

## Core Modules

### Module 1: Platform Administration

Purpose:

- allow Admins to control users, departments, and system-level settings

Required features:

- HR account management
- global user management
- user status toggles
- department override tools
- global activity overview

### Module 2: Authentication And Onboarding

Purpose:

- securely invite and activate interns

Required features:

- HR-created intern invitation
- department selection during invitation
- expiring activation token
- email activation link
- password setup
- active, suspended, and pending statuses
- JWT-based login
- role guards
- department guards

### Module 3: Department And Roster Management

Purpose:

- organize interns, supervisors, and instructors by department

Required features:

- department creation
- department editing and archiving
- supervisor assignment
- instructor assignment
- supervisor-managed instructor roster
- department-scoped access control

### Module 4: Class Scheduling

Purpose:

- allow instructors and supervisors to publish learning sessions

Required features:

- title
- agenda or description
- scheduled date and time
- external meeting URL
- upcoming class list
- past class list
- intern dashboard schedule

### Module 5: Assignment And Submission Workflow

Purpose:

- allow instructors to assign work and review intern submissions

Required features:

- assignment title
- assignment instructions
- optional rubric
- deadline
- intern submission URL
- intern submission notes
- submission timestamps
- status tracking
- review score
- written feedback
- intern feedback view

## Dashboard And Interface Requirements

Every signed-in screen lives in one dashboard shell shared by all five roles. The shell and the per-role layouts are specified in `docs/dashboard-design.md`.

Required shell behavior:

- topbar with department switcher (when the user has more than one department), ⌘K command menu, theme toggle, and user menu with the role badge
- left navigation built on beUI's `@beui/ai-sidebar` as a keyboard-navigable tree, with a collapsed icon rail on desktop and a bottom sheet below 768px
- one content template: page header with title, description, and primary action; KPI row on dashboards; panels below
- row detail and short forms open in a `@beui/drawer` on desktop and a `@beui/bottom-sheet` on mobile
- every mutation confirms with a toast naming the object acted on

Required screens by role:

| Role | Screens |
| --- | --- |
| Admin | platform overview, user management, HR account management, department overrides, activity |
| HR | department overview and management, invitations (create, revoke, history), staff directory |
| Supervisor | department overview, instructor roster, department drafts |
| Instructor | class schedule and scheduler, assignment list and editor, submission review queue and review drawer |
| Intern | department overview, class schedule, assignment list and detail, submission form, feedback view |

Required interface behavior:

- AI draft actions in the assignment editor and class scheduler run a visible button lifecycle (idle, loading, success, error) and leave the form editable and unchanged until the person accepts the draft
- every data surface defines loading, empty, error, and success states
- tables support sorting, filtering, and keyboard row navigation at roster sizes
- destructive actions (revoke invitation, archive department, remove instructor) require a deliberate confirm step

## Design System Requirements

The interface is assembled from beUI components and shadcn components on Base UI primitives, never from bespoke widgets. The rules live in `docs/design-system.md`.

Required:

- one token set: shadcn semantic color variables in oklch (the beUI default scheme), defined in `packages/ui/src/styles/globals.css`; components reference tokens, never raw color values
- one icon set: Phosphor Icons at the duotone weight, sized to match adjacent text, recolored per state through `currentColor`
- one type family: Manrope Variable, with tabular figures in tables, scores, and KPI values
- motion follows the documented durations and curves: press feedback at `scale(0.96)`, entries from `scale(0.95)` with opacity, exits softer than enters, no animation on keyboard-initiated high-frequency actions
- hover decoration is gated behind `useHoverCapable()`, and `prefers-reduced-motion` is honored through `useReducedMotion()`
- focus is visible on every interactive element, and every control defines hover, focus, active, disabled, and loading
- status is expressed with a badge and a label, never color alone
- copy uses sentence case, verb-first button labels, and errors that state the fix beside the field that failed

## Status Values

Recommended user statuses:

- Pending
- Active
- Suspended
- Archived

Recommended invitation statuses:

- Pending
- Accepted
- Expired
- Revoked

Recommended assignment statuses:

- Draft
- Published
- Closed

Recommended submission statuses:

- Not Submitted
- Submitted
- Reviewed
- Needs Changes

## MVP User Flows

Intern invitation:

1. HR selects department.
2. HR enters intern email.
3. System creates invitation token.
4. System sends activation email.
5. Intern opens link.
6. Intern sets password.
7. Intern becomes active.

Class scheduling:

1. Instructor opens class scheduler.
2. Instructor enters title, agenda, date, and meeting link.
3. Intern sees the class on department dashboard.

Assignment submission:

1. Instructor creates assignment.
2. Intern sees assignment.
3. Intern submits external link and notes.
4. Instructor reviews submission.
5. Instructor adds score and feedback.
6. Intern sees review result.

## Explicit Non-Goals

- no native video streaming
- no in-app calling
- no binary file hosting
- no real-time socket chat
- no complex analytics pipeline
- no automated code execution
- no custom component library built from scratch
- no third-party dashboard templates or mixed icon sets

## Security Requirements

- backend must enforce role permissions
- backend must enforce department scope
- inactive users cannot access the system
- invitation tokens must expire
- stored passwords must be hashed
- sensitive config must stay out of Git
- frontend route guards must not be treated as security

