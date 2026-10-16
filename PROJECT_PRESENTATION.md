# KrishiShare

## Agricultural Equipment and Labour Booking Marketplace

**Project type:** Full-stack web application  
**Purpose:** Connect farmers with agricultural equipment providers and skilled farm labour groups.

---

## 1. Project Introduction

KrishiShare is a digital marketplace designed for farmers, equipment owners,
labour providers, and platform administrators.

Farmers can search for tractors, sprayers, harvesters, and labour groups,
compare providers, create bookings, pay after provider confirmation, and view
receipts. Providers can manage their listings and booking requests. Admins can
monitor platform activity and verify providers.

The system reduces the difficulty of finding reliable farm resources at the
right time and provides a structured, transparent booking workflow.

---

## 2. Problem Statement

Farmers commonly face these problems:

- Difficulty finding equipment during peak farming seasons
- Limited access to reliable farm labour
- Unclear pricing and availability
- Manual phone-based booking
- No central record of bookings and payments
- Difficulty identifying trusted providers
- Lack of weather and task-planning support

Providers also need a simple way to:

- Advertise equipment and labour services
- Control availability
- Manage booking requests
- Track completed paid work
- View earnings after platform commission

---

## 3. Proposed Solution

KrishiShare provides one platform for:

1. Farmer registration and profile management
2. Equipment and labour discovery
3. Provider recommendations
4. Date-based booking
5. Provider confirmation
6. Secure payment workflow
7. Receipt generation
8. Provider verification
9. Weather and AI farming assistance
10. Notifications, ratings, and earnings

---

## 4. User Roles

### Farmer

- Search equipment and labour
- Book an available resource
- See estimated and final prices
- Cancel eligible bookings
- Pay after provider acceptance
- View receipts
- Use weather and AI recommendations
- Rate providers after completed work

### Provider

- Create an account
- Add equipment listings
- Add labour groups
- Pause or restore availability
- Accept or reject booking requests
- Complete accepted bookings
- View earnings and commission

### Administrator

- View platform metrics
- View providers
- Verify or suspend providers
- Monitor bookings and revenue
- View demand forecast

---

## 5. Main Application Workflow

### Provider verification workflow

```text
Provider registers
        ↓
Provider profile is created automatically
        ↓
Verification status is PENDING
        ↓
Admin opens verification management
        ↓
Admin selects VERIFIED or SUSPENDED
```

### Booking workflow

```text
Farmer searches for resource
        ↓
Farmer selects equipment or labour group
        ↓
Farmer selects start and end dates
        ↓
Backend calculates total price
        ↓
Booking is created as PENDING
        ↓
Provider accepts or rejects booking
        ↓
Accepted booking becomes payable
        ↓
Farmer completes payment
        ↓
Booking becomes PAID
        ↓
Provider completes the work
        ↓
Farmer can submit a review
```

### Booking states

```text
PENDING → ACCEPTED → COMPLETED
PENDING → REJECTED
PENDING or ACCEPTED → CANCELLED
```

### Payment states

```text
UNPAID → PAID
PAID → REFUNDED
```

Payment is available only after the provider accepts the booking.

---

## 6. Functional Modules

### Authentication and authorization

- JWT-based login
- Password hashing
- Farmer, Provider, and Admin roles
- Protected API routes
- Role-based permissions
- Public registration cannot create Admin accounts

### Equipment marketplace

- Equipment search
- Equipment type
- Daily price
- Provider details
- Availability state
- Booking support

### Labour marketplace

- Labour group name
- Number of workers
- Skill type
- Daily price
- Availability state
- Booking support

### Booking management

- Inclusive date calculation
- Backend price calculation
- Overlap prevention
- Provider lifecycle validation
- Farmer cancellation
- Booking history

### Payment management

- Dummy payment for local development
- Razorpay test-mode integration
- HMAC signature verification
- Duplicate-payment prevention
- Refund state after paid cancellation

### Receipt and invoice

- Invoice number format: `AGR-{bookingId}`
- Farmer and provider information
- Resource information
- Booking dates
- Daily rate
- Total amount
- Payment status
- Booking status

### Provider verification

Provider statuses:

- `PENDING`
- `VERIFIED`
- `SUSPENDED`

### Provider earnings

Current platform commission:

```text
10%
```

```text
Gross earnings = completed paid booking total
Commission = gross earnings × 10%
Net earnings = gross earnings - commission
```

### AI and weather support

- Farming task planning
- Price recommendations
- Open-Meteo weather advisory
- Farmer coordinates for local recommendations
- Local fallback when external services are unavailable

### Notifications and reviews

Notifications are created for:

- New booking request
- Provider acceptance or rejection
- Payment receipt
- Booking cancellation
- Booking completion

Farmers can give a rating from 1 to 5 after completion.

---

## 7. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | CSS |
| API client | Axios |
| Backend | Java 21, Spring Boot 3.4.4 |
| Security | Spring Security, JWT |
| ORM | Spring Data JPA / Hibernate |
| Database | PostgreSQL |
| Location support | PostGIS |
| Migrations | Flyway |
| Payments | Razorpay test integration |
| Optional AI | Python, FastAPI, Uvicorn |
| Backend testing | JUnit, Mockito |
| Frontend testing | Vitest |

---

## 8. Project Structure

```text
krishi/
├── backend/
│   ├── src/main/java/com/agrishare/
│   │   ├── api/
│   │   ├── domain/
│   │   ├── repository/
│   │   ├── security/
│   │   └── service/
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/
│   └── pom.xml
├── frontend/
│   ├── public/logo.png
│   ├── src/main.tsx
│   ├── src/styles.css
│   ├── src/services/api.ts
│   └── package.json
├── ml-service/
├── database/schema.sql
├── logo.png
├── README.md
└── PROJECT_PRESENTATION.md
```

---

## 9. Database Design

Important database entities:

- `users`
- `providers`
- `equipment`
- `labour_groups`
- `bookings`
- `notifications`
- `reviews`

Relationships:

```text
User 1 ─── 1 Provider
Provider 1 ─── many Equipment
Provider 1 ─── many Labour Groups
Farmer 1 ─── many Bookings
Provider 1 ─── many Bookings
Booking 1 ─── optional Review
User 1 ─── many Notifications
```

Flyway migrations:

1. Initial schema
2. Payment status
3. Notifications
4. Provider verification
5. Reviews for legacy databases
6. Missing provider profiles for existing Provider users

---

## 10. Security Design

- JWT token issued after successful login
- Passwords stored as hashes
- Admin endpoints require Admin authority
- Provider endpoints require Provider authority
- Farmer ownership checked for bookings and payments
- Provider ownership checked for provider resources
- Receipt access restricted to booking participants
- Razorpay signature verified on the backend
- Client-submitted booking total is not trusted
- Booking overlap checked on the backend
- Duplicate and invalid payment attempts rejected

---

## 11. Important API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Register Farmer or Provider |
| `POST` | `/api/auth/login` | Login |
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
| `PUT` | `/api/admin/providers/{id}/verification` | Update provider status |

---

## 12. Local Setup

### Required software

- Node.js 20+
- Java 21+
- Maven 3.9+
- PostgreSQL with PostGIS
- Python 3.11+ for optional AI service

### Create database

```sql
CREATE DATABASE agrishare;
```

### Start backend

```powershell
cd C:\Users\hp\Desktop\krishi\backend
$env:DATABASE_URL = "jdbc:postgresql://localhost:5432/agrishare"
$env:DATABASE_USERNAME = "postgres"
$env:DATABASE_PASSWORD = "your-postgres-password



"
$env:JWT_SECRET = "long-development-secret-at-least-32-characters"

mvn spring-boot:run
```

### Start frontend

Open a second terminal:

```powershell
cd C:\Users\hp\Desktop\krishi\frontend
npm install
npm run dev
```

Open the application:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:8080
```

Optional AI service:

```powershell
cd C:\Users\hp\Desktop\krishi\ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

---

## 13. Demo Accounts

| Role | Email | Password |
|---|---|---|
| Farmer | `farmer@agrishare.demo` | `password123` |
| Provider | `provider@agrishare.demo` | `password123` |
| Admin | `admin@agrishare.demo` | `password123` |

---

## 14. Demonstration Script

Use this sequence for a project presentation:

1. Open `http://localhost:5173`.
2. Login as Farmer.
3. Show equipment and labour search.
4. Open a resource and create a booking.
5. Explain that the booking is initially `PENDING`.
6. Login as Provider in another browser session.
7. Accept the booking.
8. Return to Farmer and refresh the dashboard.
9. Show that Pay Now is now available.
10. Complete dummy payment.
11. Open the receipt inside the booking card.
12. Login as Admin.
13. Open provider verification management.
14. Change a provider from `PENDING` to `VERIFIED`.
15. Show metrics, booking counts, and demand forecast.

---

## 15. Testing

### Backend tests

```powershell
cd C:\Users\hp\Desktop\krishi\backend
mvn test
```

Tests cover:

- Authentication
- JWT claims and tampered tokens
- Admin registration protection
- Booking price calculation
- Booking overlap prevention
- Provider booking lifecycle
- Payment validation
- Razorpay signature verification
- Provider earnings

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

---

## 16. Current Limitations

- Razorpay requires test credentials for real Razorpay checkout.
- Dummy payment is for development and does not charge money.
- Commission is calculated dynamically and is not yet a payout ledger.
- Receipts are in-app/API receipts, not PDF invoices.
- AI responses include deterministic local fallback behavior.
- Email and SMS notifications are not implemented.
- KYC document upload is not implemented.
- Production deployment configuration is not included.

---

## 17. Future Scope

- Provider KYC and document verification
- PDF invoice download
- Email and SMS notifications
- Persistent commission and payout ledger
- Real-time booking notifications
- Advanced provider search and filtering
- Multi-language support
- Mobile application
- Cloud deployment
- Payment settlement reports
- More advanced crop and weather intelligence

---

## 18. Quick Project Summary

**KrishiShare is a role-based agricultural marketplace that connects farmers
with verified providers, supports equipment and labour booking, enforces
provider confirmation before payment, provides receipts and earnings tracking,
and adds AI/weather assistance for better farming decisions.**

