# InternFlow

InternFlow is an intern management app. This repository is a pnpm workspace with one API in `apps/backend`, the intern app in `apps/web`, and the staff app in `apps/staff`.

## API

The API is a Hono service with MongoDB. It signs in with an HTTP-only cookie named `internity_session`. The same image runs twice:

- `API_SURFACE=public` on `PUBLIC_API_PORT`. Interns, account activation, and department reads. Admin, HR, supervisor, and instructor routes are not registered. Staff accounts cannot sign in here.
- `API_SURFACE=staff` on `STAFF_API_PORT`. Every route. Staff sign-in works only from `STAFF_ALLOWED_IPS`, the office address. Leave that list empty in development to allow this computer only. Production will not start the staff process until the office address is set.

Both processes use the same `MONGODB_URI` and `JWT_SECRET`. Intern mail uses `APP_URL`. Staff mail uses `STAFF_APP_URL`.

Ports, bind addresses, and the office address come from the environment. Copy `env.example` to `.env` and set them there. `PUBLIC_API_BIND` and `PUBLIC_API_PORT` publish the intern API. `STAFF_API_BIND` and `STAFF_API_PORT` publish the staff API. `STAFF_ALLOWED_IPS` is the office address.

```powershell
copy env.example .env
docker compose up -d mongo backend-public backend-staff
copy apps\backend\env.example apps\backend\.env
pnpm install
pnpm --filter backend seed
```

`pnpm --filter backend dev` starts one process. Development defaults that process to `API_SURFACE=staff` on `PORT` from `apps/backend/.env`. Set `API_SURFACE=public` to run the public copy yourself. `HOST` is the address that process listens on.

Health checks are `GET /health` and `GET /health/ready`.

Demo accounts use the password `Password123!`:

- `admin@internity.local`
- `hr@internity.local`
- `supervisor@internity.local`
- `instructor@internity.local`
- `intern@internity.local`

`pnpm --filter backend test` runs the API tests against `mongodb://127.0.0.1:27017/internity_test`.

### Access

Admin manages users, departments, settings, and the activity log. HR manages departments, the directory, and invitations. Supervisors manage the instructor roster in their department and can schedule classes, publish assignments, and review submissions there. Instructors do that same teaching work. Interns view their department, submit links, and read feedback.

Leave `RESEND_API_KEY` empty to have invitation and reset links returned to the caller and written to the server log. Leave `GROQ_API_KEY` empty to keep drafting off. Drafts are not saved; the normal class and assignment actions save them. The model id starts as `qwen/qwen3.8-27b`. An admin changes it with `PATCH /api/admin/settings` and `{ "groqModel": "model-id" }`. The installed Groq provider documents `qwen/qwen3.6-27b` for this reasoning mode.

`STAFF_ALLOWED_IPS` is the office address. Admin, HR, supervisor, and instructor sign-in on the staff process works only from those addresses. From anywhere else, connect to the office VPN so the request leaves through that address. Leave the list empty in development to allow this computer only. Production will not start the staff process until the address is set. The public process refuses those accounts either way. Interns are not limited. Set `TRUST_PROXY=true` only behind a proxy that replaces `X-Forwarded-For` with the client address it observed. The staff site reads the same `STAFF_ALLOWED_IPS` value.

### Route groups

- `/api/auth`
- `/api/admin`
- `/api/hr`
- `/api/supervisor`
- `/api/instructor`
- `/api/intern`
- `/api/departments`

Instructor drafting routes are `POST /api/instructor/ai/assignment-draft` and `POST /api/instructor/ai/class-agenda-draft`.

## Web

The intern app lives in `apps/web`. Copy `apps/web/env.example` to `apps/web/.env`. `WEB_HOST` and `WEB_PORT` are where it listens. `VITE_API_URL` is the public API. Run it with `pnpm --filter web dev`.

The staff app lives in `apps/staff`. Copy `apps/staff/env.example` to `apps/staff/.env`. `STAFF_HOST` and `STAFF_PORT` are where it listens. `VITE_API_URL` is the staff API. `STAFF_ALLOWED_IPS` is the office address. Run it with `pnpm --filter staff dev`.
