# KrishiShare

KrishiShare is a full-stack agricultural marketplace. Farmers can find and
book farm equipment or labour groups, providers can list resources and manage
bookings, and administrators can monitor the platform and verify providers.

## What the project contains

```text
krishi/
├── frontend/     React + TypeScript + Vite application
├── backend/      Spring Boot REST API
├── ml-service/   Optional FastAPI AI service
├── database/     Standalone database reference
├── logo.png      Project logo source file
└── README.md
```

## Main features

### Farmer

- Register and sign in
- Edit profile, village, district, latitude, and longitude
- Search equipment and labour groups
- See provider recommendations
- Create equipment or labour bookings
- View backend-calculated booking totals
- Cancel pending or accepted bookings
- Pay after the provider accepts the booking
- Use Razorpay test checkout or the local dummy-payment fallback
- View receipts for paid or refunded bookings
- Get weather advice, AI task planning, and price recommendations
- Rate a provider after a booking is completed
- Read and mark notifications as read

### Provider

- Register and receive a provider profile with `PENDING` verification
- Add, edit, delete, pause, and restore equipment listings
- Add, edit, delete, pause, and restore labour groups
- Accept, reject, and complete bookings
- View paid completed-booking earnings
- View the 10% platform commission and net earnings
- View booking receipts

### Administrator

- View farmers, providers, equipment, and booking metrics
- View revenue and cancelled-booking counts
- Review all provider profiles
- Change provider verification status:
  - `PENDING`
  - `VERIFIED`
  - `SUSPENDED`
- View the demand forecast

## Technology stack

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Axios, React Router, Recharts |
| Backend | Java 21, Spring Boot 3.4.4, Spring Security, JPA |
| Authentication | JWT |
| Database | PostgreSQL with PostGIS |
| Database migrations | Flyway |
| Payments | Razorpay test integration plus dummy-payment fallback |
| Optional AI | Python 3.11+, FastAPI, Uvicorn |
| Testing | JUnit, Mockito, Vitest |

## Prerequisites

Install these before running the project:

- Node.js 20 or newer
- npm
- Java 21 or newer
- Maven 3.9 or newer
- PostgreSQL with PostGIS
- Python 3.11 or newer (only for the optional AI service)

Check installations:

```powershell
node --version
npm --version
java --version
mvn --version
psql --version
```

## Database setup

Create the database in PostgreSQL or pgAdmin:

```sql
CREATE DATABASE agrishare;
```

If the PostgreSQL user cannot create extensions, run:

```sql
\c agrishare
CREATE EXTENSION IF NOT EXISTS postgis;
```

The backend runs Flyway migrations automatically. Current migrations are:

1. `V1__initial_schema.sql` - users, providers, equipment, labour, bookings
2. `V2__add_payment_status.sql` - payment states
3. `V3__add_notifications.sql` - notifications
4. `V4__add_provider_verification.sql` - provider verification
5. `V5__add_reviews_for_existing_databases.sql` - reviews for legacy databases
6. `V6__create_missing_provider_profiles.sql` - profiles for existing providers

Do not normally run the migration files manually.

## Environment variables

The backend reads environment variables from the terminal that starts it. It
does not automatically load the root `.env` file.

In PowerShell:

```powershell
$env:DATABASE_URL = "jdbc:postgresql://localhost:5432/agrishare"
$env:DATABASE_USERNAME = "postgres"
$env:DATABASE_PASSWORD = "your-postgres-password"
$env:JWT_SECRET = "use-a-long-development-secret-at-least-32-characters"
```

Optional Razorpay test credentials:

```powershell
$env:RAZORPAY_KEY_ID = "your-test-key-id"
$env:RAZORPAY_KEY_SECRET = "your-test-key-secret"
```

`.env.example` is only a template. Never commit real passwords, JWT secrets,
or payment keys.

## Run the application

Run each service in a separate PowerShell window.

### 1. Start the backend

```powershell
cd C:\Users\hp\Desktop\krishi\backend

$env:DATABASE_URL = "jdbc:postgresql://localhost:5432/agrishare"
$env:DATABASE_USERNAME = "postgres"
$env:DATABASE_PASSWORD = "your-postgres-password"
$env:JWT_SECRET = "use-a-long-development-secret-at-least-32-characters"

mvn spring-boot:run
```

Backend URL:

```text
http://localhost:8080
```

Health check:

```text
http://localhost:8080/api/health
```

### 2. Start the frontend

```powershell
cd C:\Users\hp\Desktop\krishi\frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

### 3. Start the optional AI service

```powershell
cd C:\Users\hp\Desktop\krishi\ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

The AI service is optional. The backend has deterministic local fallback
responses when the AI service or weather provider is unavailable.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Farmer | `farmer@agrishare.demo` | `password123` |
| Provider | `provider@agrishare.demo` | `password123` |
| Admin | `admin@agrishare.demo` | `password123` |

New registrations can create Farmer or Provider accounts. Admin accounts
cannot be created through the public registration form.

## Important business workflows

### Provider verification

```text
Create Provider account
        ↓
Provider profile is created automatically
        ↓
Verification status = PENDING
        ↓
Admin opens Partner & Provider Verification Management
        ↓
Admin selects VERIFIED or SUSPENDED
```

If a legacy Provider user has no provider profile, migration V6 creates one.

### Booking and payment

```text
Farmer creates booking
        ↓
Booking status = PENDING
        ↓
Provider accepts booking
        ↓
Booking status = ACCEPTED
        ↓
Farmer sees Pay Now
        ↓
Payment status = PAID
```

Payment is intentionally unavailable while a booking is still `PENDING`.
This rule is enforced in both the frontend and backend.

Booking lifecycle:

```text
PENDING → ACCEPTED → COMPLETED
PENDING → REJECTED
PENDING or ACCEPTED → CANCELLED
```

Payment states:

```text
UNPAID
PAID
REFUNDED
```

Cancelling a paid booking changes its payment state to `REFUNDED`.

### Dummy payment

When Razorpay credentials are not configured, the frontend falls back to the
internal dummy payment flow. This is for local development only and does not
charge real money.

### Receipt

Receipt endpoint:

```text
GET /api/bookings/{id}/invoice
```

Receipt data includes invoice number, farmer, provider, resource, dates, daily
rate, total amount, booking status, and payment status. The receipt opens
inside the selected booking card.

## Useful API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Create Farmer or Provider account |
| `POST` | `/api/auth/login` | Sign in and receive JWT |
| `GET` | `/api/equipment` | Search equipment |
| `GET` | `/api/labour` | Search labour groups |
| `POST` | `/api/bookings` | Create booking |
| `GET` | `/api/bookings/my` | Farmer booking history |
| `POST` | `/api/bookings/{id}/cancel` | Cancel booking |
| `POST` | `/api/bookings/{id}/pay` | Dummy payment |
| `POST` | `/api/bookings/{id}/payment-order` | Create Razorpay order |
| `POST` | `/api/bookings/{id}/payment-verify` | Verify Razorpay payment |
| `GET` | `/api/bookings/{id}/invoice` | Get receipt |
| `GET` | `/api/providers/me/earnings` | Provider earnings |
| `GET` | `/api/admin/dashboard` | Admin metrics |
| `GET` | `/api/admin/providers` | Provider verification list |
| `PUT` | `/api/admin/providers/{id}/verification` | Change verification |

Protected endpoints require:

```text
Authorization: Bearer <jwt-token>
```

## Testing and build

### Backend tests

```powershell
cd C:\Users\hp\Desktop\krishi\backend
mvn test
```

Backend tests cover authentication, JWT security, booking totals, overlap
prevention, payment verification, dummy payment, provider lifecycle, provider
earnings, and Razorpay signature validation.

### Frontend tests

```powershell
cd C:\Users\hp\Desktop\krishi\frontend
npm test
```

### Production build

```powershell
cd C:\Users\hp\Desktop\krishi\frontend
npm run build
```

## Branding

The current logo is stored in:

- `logo.png` - project source copy
- `frontend/public/logo.png` - browser-served copy

The frontend uses:

```tsx
<img src="/logo.png" alt="AgriShare" />
```

If the source logo is changed, copy it to `frontend/public/logo.png` as well.
Then refresh the browser with `Ctrl + Shift + R`.

## Troubleshooting

### `mvn` is not recognized

Install Maven, add its `bin` folder to `PATH`, reopen PowerShell, and run:

```powershell
mvn --version
```

### Backend cannot connect to PostgreSQL

Check that:

1. PostgreSQL service is running.
2. Database `agrishare` exists.
3. `DATABASE_PASSWORD` is correct.
4. PostgreSQL is listening on port `5432`.
5. The environment variables were set in the same terminal that starts Maven.

### Port 8080 or 5173 is already in use

Find the process:

```powershell
Get-NetTCPConnection -LocalPort 8080,5173 -State Listen
```

Stop only the specific process after verifying its PID:

```powershell
Stop-Process -Id <PID>
```

### Provider is not visible in admin verification

Check that:

1. The account was registered as `PROVIDER`, not `FARMER`.
2. The backend was restarted after the latest code change.
3. Flyway migration V6 completed successfully.
4. The admin page was hard-refreshed with `Ctrl + Shift + R`.

New providers appear with `PENDING` status. Admin must manually change the
status to `VERIFIED`.

### Payment button is missing

The Pay Now button appears only after the provider accepts the booking. A
`PENDING` booking cannot be paid.

### Logo appears old

Copy the latest logo to `frontend/public/logo.png`, restart Vite if needed, and
hard-refresh the browser:

```text
Ctrl + Shift + R
```

## Important development notes

- Do not commit database passwords or API keys.
- Dummy payment is not a real payment gateway.
- Razorpay requires valid test credentials.
- Commission is currently calculated at 10% and is not stored as a payout ledger.
- Receipts are currently in-app/API receipts, not PDF files.
- AI and Open-Meteo have local fallbacks.
- Existing test bookings and labour groups may remain in the local database.

## Project status

Implemented:

- Authentication and role-based authorization
- Farmer, Provider, and Admin dashboards
- Equipment and labour CRUD
- Booking creation and overlap prevention
- Provider confirmation workflow
- Payment and refund states
- Razorpay integration and dummy fallback
- Receipts and invoice API
- Provider verification management
- Provider earnings and commission
- Notifications and reviews
- Weather and AI fallbacks
- PostgreSQL/PostGIS schema with Flyway migrations
- Backend and frontend tests
- Custom KrishiShare branding
