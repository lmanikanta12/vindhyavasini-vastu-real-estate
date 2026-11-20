# Vindhyavasini Vastu and Real Estate

Vastu Consultancy and Real Estate Management System. One platform where customers find properties and book Vastu consultations, and where agents, consultants and the admin run the business behind it.

    vastu-estates/
    ├── frontend/    React + Vite + Tailwind CSS (public website and four dashboards)
    ├── backend/     Node.js + Express + MongoDB (REST API)
    └── README.md    this file, the only README in the project

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Getting started](#getting-started)
5. [Environment variables](#environment-variables)
6. [Accounts and roles](#accounts-and-roles)
7. [Backend](#backend)
8. [Frontend](#frontend)
9. [How the modules connect](#how-the-modules-connect)
10. [Email, payments and reminders](#email-payments-and-reminders)
11. [Security](#security)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)

## Features

| Module | What it does |
| --- | --- |
| Authentication | Register with email OTP, login, forgot password, role based access, account lock after 5 wrong passwords |
| Property management | Listings with up to 12 photos, filters, search, map, shortlist and compare, sold/rented status |
| Enquiries and leads | Enquiry to the property's agent, status flow, follow-up notes (can be marked private, staff only), assignment by admin |
| Site visits | Slot booking against the agent's working days, hours and days off, reschedule, confirm, complete |
| Vastu consultancy | Services and fees, consultant slots, booking, assessment notes, recommendations, PDF Vastu report |
| Construction | Public Construction page with a request form (reference CN-7001 and so on); customers follow status, quote and notes on their dashboard; the admin changes status, assigns an agent, sets a quote and adds notes |
| Reviews and ratings | Customers rate a completed consultation or site visit once; averages show on the booking and property pages; the admin can hide a review |
| Payments | Razorpay checkout (test and live), webhook, PDF receipts, payment records added by admin |
| Dashboards | Separate dashboards for Customer, Agent, Consultant and Admin |
| Reports | Date filters, charts, export to Excel and PDF (admin) |
| Activity log | Who did what and when, searchable (admin) |
| Notifications | In-app notifications, HTML emails and automatic reminders |
| Legal and privacy | Terms, Privacy and Vastu disclaimer pages, consent at sign-up, customers can download their data and delete their account |

## Tech stack

| Part | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3, lucide-react icons |
| Backend | Node.js 18+, Express 5, Mongoose 9 |
| Database | MongoDB (local or Atlas) |
| Auth | JWT, bcrypt password hashes, email OTP |
| Payments | Razorpay (HMAC verified, optional webhook) |
| Email | Nodemailer (Gmail SMTP or any SMTP) |
| Files | pdfkit (receipts, reports), exceljs (Excel export), node-cron (reminders) |
| Photo storage | Cloudinary (free plan) or the server disk when Cloudinary is not set |

## Project structure

    backend/
    ├── assets/fonts/        DejaVu Sans, so the rupee sign prints in PDFs
    ├── scripts/
    │   ├── e2e.mjs          end-to-end API test
    │   └── fixtures/        test accounts and listings used only by the test
    ├── src/
    │   ├── config/          env.js (settings), db.js (MongoDB connection)
    │   ├── middleware/      auth.js (JWT and roles), security.js (rate limits, input guard), error.js
    │   ├── models/          Mongoose models
    │   ├── routes/          one file per API group
    │   ├── services/        email, OTP, payments, reminders, PDF, reports, slots, notifications, storage
    │   ├── seed/            admin.js and services.json (first-run data)
    │   ├── utils/           pagination, password, error and helper functions
    │   ├── app.js           Express app
    │   └── server.js        starts the server, DB connection and reminders
    ├── uploads/             uploaded photos and files (not committed)
    └── .env.example

    frontend/
    ├── public/
    └── src/
        ├── components/      ui, layout, charts, property, shared modals
        ├── config/          navigation per role
        ├── context/         Auth, Data, Theme, Toast
        ├── hooks/           server-paged lists, notifications, shortlist, visit slots
        ├── layouts/         public layout
        ├── lib/             api client, constants, utilities
        ├── pages/           public, auth, legal, customer, agent, consultant, admin, shared
        ├── routes/          route guards by role
        ├── App.jsx
        └── main.jsx

## Getting started

You need Node.js 18 or newer and a MongoDB database (installed locally, or a free MongoDB Atlas cluster). Use two terminals.

**Backend**

    cd backend
    npm install
    cp .env.example .env        # Windows PowerShell: copy .env.example .env

Open `backend/.env` and set `MONGODB_URI` and `JWT_SECRET`. Then:

    npm run seed:admin          # creates the first admin and the standard Vastu services (run once)
    npm run dev                 # API on http://localhost:5000

**Frontend**

    cd frontend
    npm install
    npm run dev                 # website on http://localhost:5173

Vite forwards `/api` and `/uploads` to the backend in development, so no CORS setup is needed. The database starts empty apart from the admin and the services. Everything else (agents, consultants, listings) is created through the application.

## Environment variables

Backend, in `backend/.env` (full list with comments in `.env.example`):

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | API port, default 5000 |
| `CLIENT_URL` | Website address, used for CORS and email links |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Token signing secret and lifetime |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PHONE` | First admin created by `seed:admin` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Outgoing email |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` | Photo storage; leave empty to save in `backend/uploads` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Payments |
| `PAYMENT_MODE` | `razorpay` or `demo`; left empty it is chosen from whether keys exist |
| `RATE_LIMIT` | Set to `off` only for the automated test, never in production |

Frontend, in `frontend/.env` (both optional):

| Variable | Purpose |
| --- | --- |
| `VITE_PROXY_TARGET` | Backend address for the dev proxy if it is not `http://localhost:5000` |
| `VITE_API_URL` | API address for a production build hosted on a different domain |

## Accounts and roles

Only the admin exists after setup. Its login is `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `backend/.env`. Change that password after the first login.

| Role | How the account is created | Main screens |
| --- | --- | --- |
| Customer | Signs up on the website and confirms the email with a 6-digit code | Overview, shortlist, enquiries, appointments (with ratings), payments, profile and My data |
| Agent | Added by the admin; login details arrive by email | Overview, listings, enquiries and leads, site visits, customers, my schedule |
| Consultant | Added by the admin; login details arrive by email | Overview, consultation requests, schedule and slots, services |
| Admin | Created by `seed:admin` | Overview, users and roles, listings, enquiries, appointments, payments, reports, reviews, activity log, settings |

## Backend

### API groups

All routes start with `/api`. Every route checks the user's role on the server.

| Group | Used for |
| --- | --- |
| `/auth` | register, verify email, login, resend code, forgot and reset password, current user |
| `/bootstrap` | the data a dashboard needs on load, limited to what that role may see |
| `/users` | profiles, staff management, availability |
| `/properties` | listings, search and filters, photos, status |
| `/enquiries` | enquiries, notes, assignment, status |
| `/construction` | `POST /` send a request (guest or customer), `GET /` own requests (customer) or all (admin), `PATCH /:id` status, agent, quote (admin), `POST /:id/notes` (admin) |
| `/site-visits` | visits, free slots, reschedule, status |
| `/services` | Vastu services and fees |
| `/consultations` | bookings, notes, recommendations, `GET /:id/report.pdf` |
| `/payments` | create, pay, verify, webhook, `GET /:id/receipt.pdf` |
| `/reports` | overview, summary, `export.pdf`, `export.xlsx` (admin) |
| `/activity` | activity log (admin) |
| `/reviews` | `POST /` rate a completed booking (customer), `GET /summary` and `GET /staff/:id` public ratings, `GET /mine`, admin list and hide (`PATCH /:id`) |
| `/account` | customer only: `GET /export` (download own data), `POST /delete` (close own account) |
| `/notifications`, `/shortlist`, `/settings`, `/uploads` | notifications, saved properties, business settings, file upload |

List endpoints accept `?page`, `limit`, `q`, `sort` and `dir`, and answer with `{ items, total, page, pages, limit, refs }`. `refs` carries the users, properties and services the page refers to, so the screen can show names without extra calls.

### Database models

User, Property, Enquiry, ConstructionRequest, SiteVisit, Service, Consultation, Payment, Review, Notification, Shortlist, Setting, ActivityLog, Otp and Counter (for readable references such as VE-1001). Money is stored in rupees; dates for visits and consultations are stored as local `YYYY-MM-DD` plus a time slot.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with auto-restart (nodemon) |
| `npm start` | Start for production |
| `npm run seed:admin` | Create the first admin and the Vastu services; safe to run again |
| `npm run test:e2e` | Run the end-to-end API test |
| `npm run seed:demo` | Optional: add demo accounts, listings, enquiries, visits, consultations and construction requests (password `Test@12345`). Never run on a live database |
| `npm run test:seed` | Same data, used before the test |

## Frontend

The website has public pages (home, properties, property detail, Vastu services, book a consultation, contact), the sign-in pages, three legal pages and the four dashboards. Routes are protected by role guards, and each role sees its own menu.

Data handling:

- `GET /api/bootstrap` fills the dashboard when it opens.
- Long tables (users, listings, enquiries, visits, payments, consultations, activity) are loaded one page at a time from the server with search and sorting, using the `useServerList` hook.
- Changes go through the API first; the screen updates from the server's answer.
- The login token is kept in the browser as `ve-token`. A 401 answer signs the user out.
- Downloads (receipts, Vastu reports, report exports) go through an authenticated request, not a plain link.

Scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build into `dist` |
| `npm run preview` | Serve the build locally |

## How the modules connect

- An enquiry goes to the agent of that property; if there is no agent the admin is alerted. Status changes and notes notify the customer.
- A site visit notifies the agent. An agent cannot be double booked or booked outside their working days, hours or days off. A visit made from an enquiry moves it to Scheduled, and completing the visit completes the enquiry.
- A consultation booking checks the consultant's slot, takes the fee from the service price on the server and creates a pending payment. When paid, the receipt is emailed and the consultant and admin are notified.
- Cancelling removes an unpaid fee. If it was already paid, the admin is alerted so the refund can be done by hand.
- Marking a listing sold or rented notifies customers who saved it. Deleting a listing cancels its open visits.
- A construction request starts as New and moves through Site visit, Quoted, In progress and Completed (or Closed). Each change, quote and note reaches the customer by notification and email, and the admin is alerted to every new request. Only the admin manages requests; agents and consultants have no Construction page.
- Important actions are written to the activity log with the person and the time.
- A note on an enquiry can be marked private. Private notes are removed on the server before an enquiry is sent to a customer, so only the agent and the admin ever receive them.
- After a consultation or site visit is completed, the customer can rate it from 1 to 5 stars with an optional comment, once per booking and only for their own booking. The consultant or agent is notified, the average appears on the consultant card in the booking page and on the property page, and they see their reviews on their dashboard. Only the first name and last initial are shown. The admin can hide a review, which also removes it from the average.
- A customer can download their data and delete their account from Profile, My data. Deleting asks for the password, is blocked while a payment is pending, cancels open visits and consultations (the admin is alerted if one was already paid), and erases name, email, phone and address. Payment records and enquiries stay, shown as "Deleted user", because accounting needs them.

## Email, payments and reminders

**Email.** With `SMTP_USER` empty, emails are printed in the backend terminal, enough for testing OTP codes and receipts. For Gmail, turn on 2-step verification, create an App Password and set `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`.

**Photo storage.** Uploads go to Cloudinary when the three `CLOUDINARY_` values are set, and the listing keeps the returned link. With them empty, files are saved in `backend/uploads` and served from `/uploads`. Cloudinary is the right choice on free hosting, because the server disk there is wiped on restart. Create a free account at cloudinary.com and copy the values from Settings, API Keys. Photos already saved on disk keep working after you switch.

**Payments.** With no Razorpay keys the application uses a built-in demo checkout so the full flow can be tried. To take real payments, set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` and restart; the checkout switches to Razorpay on its own. In Test Mode use card `4111 1111 1111 1111` with any future date and CVV, or UPI id `success@razorpay`. The webhook `/api/payments/webhook` is optional and needs a public address; it covers the case where a customer pays and closes the browser before confirmation. Set `PAYMENT_MODE=razorpay` in production so the demo checkout can never be used.

**Reminders.** A scheduled job runs every 10 minutes for upcoming visits and consultations, and unpaid fees get a reminder every two days. Timing can be changed by the admin under Settings.

## Security

- Passwords are hashed with bcrypt; login locks after 5 wrong attempts.
- JWT on every protected route; role checks on the server for every action.
- Rate limits on the API and tighter limits on login, OTP and password reset.
- Request input is checked against NoSQL operator injection; helmet sets security headers.
- Payment amounts come from the server, and Razorpay signatures are verified.
- Uploads are limited by type and size and renamed on save.
- Private enquiry notes never leave the server for customers; account deletion needs the password.

## Testing

`backend/scripts/e2e.mjs` runs 184 checks against a running server: sign-up and OTP, lockout, permissions for every role, listings, enquiries, construction requests, visits, availability rules, consultations, payments, PDF and Excel downloads, reports, pagination and the activity log.

    cd backend
    npm run seed:admin
    npm run test:seed
    RATE_LIMIT=off npm run dev       # PowerShell: $env:RATE_LIMIT="off"; npm run dev
    npm run test:e2e                 # in a second terminal

`test:seed` (also available as `seed:demo`) adds accounts with the password `Test@12345` and a few listings. Use it only on a database you are happy to fill with test data, never on a live one.

## Deployment

1. Set `NODE_ENV=production`, a long random `JWT_SECRET`, real SMTP details, Razorpay live keys with `PAYMENT_MODE=razorpay`, and `CLIENT_URL` to the website address.
2. Backend: `npm install --omit=dev`, then `npm start` behind HTTPS (a process manager such as PM2 is recommended).
3. Frontend: `npm run build` in `frontend`, and host `dist` on any static host or Nginx. Send `/api` and `/uploads` to the backend, or build with `VITE_API_URL` if the API is on another domain.
4. Set the `CLOUDINARY_` values so photos are stored online. Without them, `backend/uploads` on the server disk is used, and it must be kept on storage that survives restarts and be backed up.
5. The Terms, Privacy and Disclaimer pages contain general starting text. Have a lawyer review them before launch.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Browser cannot reach the server | The backend is not running, or MongoDB is down |
| `ECONNREFUSED 27017` | Start MongoDB, or use an Atlas connection string |
| No emails | Check the `SMTP_` values, use an App Password, and read the backend terminal for the error |
| Port already in use | Change `PORT` in `backend/.env` and `VITE_PROXY_TARGET` in `frontend/.env` |
| Forgot the admin password | Use Forgot password on the login page; `ADMIN_PASSWORD` only applies the first time `seed:admin` runs |
