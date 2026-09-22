# InternFlow

InternFlow is an intern management app. This repository is a pnpm workspace with the API in `apps/backend` and the web app in `apps/web`.

## API

The API is a Hono service with MongoDB. It signs in with an HTTP-only cookie named `internity_session`.

```powershell
docker compose up -d mongo
copy apps\backend\env.example apps\backend\.env
pnpm install
pnpm --filter backend seed
pnpm --filter backend dev
```

The API listens on `http://localhost:4000`. Health checks are `GET /health` and `GET /health/ready`.

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

`STAFF_ALLOWED_IPS` limits admin, HR, supervisor, and instructor sign-in to those addresses. Leave it empty to allow any network. Interns are not limited. Set `TRUST_PROXY=true` only behind a proxy that sets `X-Forwarded-For`.

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

The TanStack Start app lives in `apps/web`. Run it with `pnpm --filter web dev`.
