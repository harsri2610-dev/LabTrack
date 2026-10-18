# Diagnostic Lab Platform

A full-stack platform for diagnostic laboratories covering test booking, sample
chain-of-custody tracking, report generation/verification, consent-based doctor
access, and secure patient result delivery.

**Stack:** React + TypeScript (frontend) · Node.js + Express + TypeScript (backend)
· MongoDB · Redis · REST API · Docker · Git

## Project structure

```
diagnostic-lab-platform/
├── backend/                # Express + TypeScript API
│   ├── src/
│   │   ├── config/         # env, MongoDB client, Redis client
│   │   ├── middleware/     # auth, RBAC, validation, rate limiting, error handling
│   │   ├── modules/        # auth, bookings, samples, reports, doctors, catalog
│   │   ├── utils/          # jwt, audit logging, ApiError, logger
│   │   ├── app.ts          # Express app assembly
│   │   ├── server.ts       # API process entry point
│   │   └── worker.ts       # Background job worker entry point (BullMQ)
├── frontend/                # React + TypeScript (Vite) SPA
│   └── src/
│       ├── api/client.ts    # Axios instance with silent token refresh
│       ├── context/AuthContext.tsx
│       ├── components/      # Navbar, ProtectedRoute
│       └── pages/           # Login, Register, per-role dashboards, booking, report view
└── docker-compose.yml
```

## Roles

| Role | Capabilities |
|---|---|
| `patient` | Register/login, browse test catalog, book tests, view own bookings/reports, grant/revoke doctor access |
| `doctor` | View only patients who explicitly granted access, view their released reports |
| `lab_staff` | Register samples, update chain-of-custody status |
| `pathologist` | Create draft reports, verify reports |
| `admin` | Full access; intended home for catalog management, doctor verification, user administration |

## Getting started (Docker)

```bash
cp .env.example .env
# edit .env — set real JWT secrets and a MongoDB password before doing anything beyond local dev

docker compose up --build
```

- API: http://localhost:4000/api (health check at `/health`)
- Frontend: http://localhost:5173
- MongoDB runs as the primary persistence layer. On startup, the API creates
  the required indexes; it does not seed users, bookings, specimens, reports,
  or catalog items.

## Local development (without Docker)

```bash
# Backend
cd backend
npm install
npm run dev        # ts-node with hot reload, needs MongoDB + Redis reachable

# Frontend
cd frontend
npm install
npm run dev         # Vite dev server on :5173
```

You still need MongoDB and Redis running somewhere. The backend reads both
`backend/.env` and the project-root `.env` (without overriding variables already
set in the process). For a backend running directly on your machine, use
host-reachable service URLs, for example `mongodb://localhost:27017/diagnostic_lab`
and `redis://localhost:6379`. The example `.env` uses Docker service hostnames
and credentials, so those values should be changed when running the backend
outside Docker. When connecting to MongoDB Atlas, use the Atlas URI as described
below.

To use MongoDB Atlas, put your Atlas connection string in `MONGODB_URI` in the
project-root `.env` file and set `MONGODB_DB` to the database name. Docker
Compose passes that URI to both the API and worker; if `MONGODB_URI` is unset,
they connect to the local `mongo` service. URL-encode special characters in the
database user's password, and allow your machine's IP in the Atlas network
access list. Keep `.env` private and never commit or share its credentials.

## Account registration and staff provisioning

Authentication uses MongoDB accounts, bcrypt password hashes, access tokens,
and rotated refresh tokens in an httpOnly cookie. There are no demo logins or
automatic demo-account creation.

- Patients and doctors can register through the public registration form.
  Public registration does not permit privileged roles.
- Provision the first administrator only when no admin account exists. Set a
  strong, temporary `ADMIN_BOOTSTRAP_TOKEN` (at least 32 characters) in the
  backend environment and call `POST /api/auth/bootstrap-admin` from a trusted
  administrative environment with that value in the
  `x-admin-bootstrap-token` header. Provide the administrator's real name,
  email, phone, and a unique password of at least 12 characters. Do not put the
  token in frontend code or share it. Remove/unset it after bootstrap.
- If an administrator already exists, use that account to provision
  `lab_staff`, `pathologist`, or additional `admin` accounts through
  `POST /api/admin/users`. This endpoint requires an authenticated admin
  bearer token. Submit a real user's name, email, and unique password of at
  least 12 characters; doctor and pathologist accounts must also include a
  real `registrationNo`. The backend hashes passwords before storing users
  and applies role-based access control to protected routes.

Startup no longer inserts or overwrites example accounts and clinical records.
This source change does not delete or migrate existing MongoDB documents; any
records created by older startup seeding remain untouched and should be
reviewed by an authorized administrator before they are treated as real.

## Key design decisions

- **Modular monolith, not microservices.** One Express app with clearly
  separated modules (`auth`, `bookings`, `samples`, `reports`, `doctors`,
  `catalog`). Split into separate services later only if scale actually
  demands it.
- **Consent-based doctor access.** A doctor never sees a patient by default.
  Access is a document in `doctor_patient_access`, created only by the patient
  (or an admin), optionally time-bound, and revocable at any time.
- **Sample chain-of-custody as a state machine.** `samples.service.ts`
  enforces valid status transitions (`collected → in_transit → received_at_lab
  → processing → completed`, with `rejected` reachable from any
  non-terminal state) and logs every transition to the `sample_status_log`
  collection for a full audit trail.
- **Async report release.** Verifying and releasing a report enqueues a
  BullMQ job (PDF generation + notification) instead of blocking the request.
  Run `worker.ts` as its own container in production so job processing never
  competes with API request handling.
- **Security baseline:** bcrypt password hashing, short-lived JWT access
  tokens + rotated refresh tokens (stored hashed, httpOnly cookie), RBAC
  middleware on every sensitive route, Zod validation on all inputs, Redis-backed
  login throttling on top of `express-rate-limit`, and an immutable
  `audit_logs` collection recording every report view/release and access grant —
  the kind of trail most healthcare-data regulations expect.

## What's stubbed / next steps

This scaffold is meant to run and be built on, not to be a finished product.
Before production use:

- Replace the placeholder PDF generation in `reports.queue.ts` with real
  rendering (Puppeteer + an HTML report template is a good fit) and wire it
  to actual file storage (S3 or equivalent) with signed, expiring URLs.
- Wire `notifications` documents to a real email/SMS provider.
- Add field-level encryption for PII fields (`patients.dob`, `address`, etc.).
- Add MFA enrollment/verification flow (the `users.mfa_secret` and
  `mfa_enabled` fields are already there).
- Add an admin UI for test-catalog management and doctor verification
  (`doctors.verified` currently has to be flipped manually in the DB).
- Add automated tests (Jest is already in `package.json`) and CI (GitHub
  Actions: lint → typecheck → test → build → push image).
