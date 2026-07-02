# CertiGen

CertiGen is a secure, modern digital portal for certificate generation, digital signing, and automated delivery for (`ExamCell IIIT-Lucknow`).

The platform provides a streamlined workflow where students can request certificates (such as Bonafide Certificates), administrators can securely verify and digitally sign requests, and the system automatically delivers signed documents via Email and WhatsApp, accompanied by Firebase web push notifications.

---

## 🚀 Key Features

- **Modern Architecture**: Built with Next.js 15 (App Router) and React 19 for fast, server-side rendered pages and API routes.
- **Serverless Database**: PostgreSQL database hosted on **Neon**, connected via **Prisma ORM** for efficient pooling and migrations.
- **Advanced Authentication (Better Auth)**:
  - **Students**: Passwordless login using Email OTP.
  - **Administrators**: Multi-factor authentication including Password + Email OTP + Mandatory TOTP 2FA (Google Authenticator / Authy).
  - Secure, HTTP-only session cookies.
- **Dynamic PDF Generation**: High-performance, declarative PDF generation using `@react-pdf/renderer` directly on the server, replacing legacy iText structures.
- **Multi-channel Notifications & Delivery**:
  - **Firebase Cloud Messaging (FCM)** for browser-based push notifications.
  - **WhatsApp Cloud API** for SMS-alternative OTP and certificate delivery.
  - **Nodemailer (SMTP)** for email delivery with signed attachments.
- **Service Layer Pattern**: Decoupled design where API routes call service layers under `lib/services/` to manage database operations and third-party APIs.

---

## 📁 File Structure

Here is the directory structure of the migrated Next.js application:

```text
CertiGen/
├── app/                            # Next.js App Router (Pages, Layouts & API routes)
│   ├── admin-login/                # Admin login interface
│   ├── admin/
│   │   └── 2fa-setup/              # TOTP 2FA QR code enrollment page
│   │   └── page.jsx
│   ├── api/                        # Backend REST endpoints
│   │   ├── admin/                  # Admin stats, student lists, CSV imports
│   │   ├── auth/                   # Better Auth catch-all route ([...all]/route.js)
│   │   ├── bonafide/               # Generate, sign, download, and dispatch certificates
│   │   ├── cron/                   # Daily cron job for deactivating expired certificates
│   │   ├── logs/                   # System audit logs API
│   │   ├── password-requests/      # User password request operations
│   │   ├── students/               # Student profile and token updates
│   │   └── test-db/                # DB connectivity sanity check
│   ├── dashboard/                  # Dashboard router (certificates, users, logs, etc.)
│   ├── history/                    # Student request history page
│   ├── input-form/                 # Student certificate request input form
│   ├── login/                      # Student OTP login interface
│   ├── globals.css                 # Global styling config
│   ├── layout.jsx                  # Main wrapper layout
│   └── page.jsx                    # Landing page routing
├── components/                     # Reusable React UI Components
│   ├── pdf/
│   │   └── BonafideTemplate.jsx    # React PDF document template design
│   ├── admin-dashboard.jsx         # Administrative hub layout
│   ├── Footer.jsx
│   ├── NotificationHandler.jsx     # FCM notification registers
│   ├── stats-cards.jsx             # Admin dashboard analytics cards
│   └── ...                         # Data tables (users, logs, certs, change password)
├── lib/                            # Core Configuration and Service Layer
│   ├── services/                   # Business logic isolated from controllers
│   │   ├── adminService.js         # CSV export, stats, and delete student
│   │   ├── bonafideService.js      # Certificate issuance and state transitions
│   │   ├── certificateGenerator.js # Generates PDF buffer from React template
│   │   ├── emailService.js         # Nodemailer integration (OTPs & attachments)
│   │   ├── firebaseService.js      # FCM Admin SDK dispatch logic
│   │   ├── passwordReqService.js   # Reset request handler
│   │   ├── studentService.js       # CRUD operations for student entities
│   │   └── whatsAppService.js      # Meta WhatsApp API integration
│   ├── auth.js                     # Better Auth server configuration
│   ├── auth-client.js              # Better Auth client hook setup
│   ├── firebase-admin.js           # Firebase Admin SDK init singleton
│   ├── prisma.js                   # Prisma Client singleton
│   └── require-role.js             # Server-side authorization check utility
├── prisma/
│   └── schema.prisma               # Prisma schema modeling (PostgreSQL)
├── public/                         # Static assets and Web Worker scripts
│   ├── assets/
│   │   └── logo.png                # Main branding asset
│   └── firebase-messaging-sw.js    # Firebase Messaging Service Worker
├── MigrationPlan.md                # Technical Spring Boot -> Next.js blueprint
├── running.md                      # Detailed local runtime configuration instructions
├── commit.md                       # Structured multi-phase git commit guide
├── next.config.js                  # Next.js compiler parameters
└── package.json                    # Dependencies and package details
```

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: v18+ or v22.20.0 (Recommended)
- **Database**: PostgreSQL connection (e.g., Neon serverless)

### 1. Environment Setup

Copy `.env.local.sample` or create a new `.env.local` file at the root of the project:

```bash
DATABASE_URL="postgresql://..."        # Neon pooled database connection string
BETTER_AUTH_SECRET="your-secret-key"   # A random 32+ character string
BETTER_AUTH_URL="http://localhost:3000" # Base URL of the application
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
WHATSAPP_USER_ACCESS_TOKEN="..."
WHATSAPP_VERSION="v20.0"
WHATSAPP_PHONE_NUMBER_ID="..."
FIREBASE_PROJECT_ID="..."
FIREBASE_SERVICE_ACCOUNT_JSON='{...}' # Firebase service account key config
```

### 2. Dependency Installation

Install all package dependencies. `--legacy-peer-deps` is required to resolve peer dependencies with React 19 for `@react-pdf/renderer`:

```bash
npm install --legacy-peer-deps
```

### 3. Database Sync

Apply your Prisma schema to your Neon PostgreSQL instance:

```bash
npx prisma db push
```

### 4. Running the Development Server

Start the local server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application in the browser.

---

## 🔒 Security Architecture

1. **Double-check Guard Rails**: Routes first pass through the central `middleware.js` to ensure the presence of a session cookie. Each individual API route and Server Action then invokes `requireRole()` from `lib/require-role.js` to re-authorize the user and check specific role permissions (Defense-in-Depth).
2. **Secure Credentials**: Admin passwords are automatically hashed using Better Auth's standard algorithms. Sessions are strictly stored inside Secure, HttpOnly cookies to defend against XSS attacks.
3. **Mandatory Admin TOTP**: Admins are forced to register with an authenticator app (like Google Authenticator) on their initial sign-in and present a 6-digit dynamic passcode for every login.
