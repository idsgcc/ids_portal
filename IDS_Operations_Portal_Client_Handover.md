# IDS Operations Portal — Client Handover Overview
**IDS-GCC Internal Operations System | August 2026**

---

## System Overview

The IDS Operations Portal is a private, web-based internal management system built for IDS-GCC Gulf region operations. It consists of three integrated components: a web portal for day-to-day operations, a cloud database, and an automated tender monitoring service.

---

## Components

### 1. Web Portal
**URL:** https://ids-portal-gold.vercel.app/

The portal is the primary user interface. It provides access to the following modules:

| Module | Description |
|---|---|
| **Projects** | Track active projects, task lists, priorities, and statuses |
| **Opportunities** | Manage bids and incoming work; auto-creates a project on award |
| **Financials** | POs and invoices to/from clients and suppliers (admin only) |
| **Finance Dashboard** | Summary of invoices paid and overdue (admin only) |
| **Tender Monitoring** | Monitor and manually trigger Nama and OETC portal scrapers |
| **Contacts** | Searchable contact directory (1,100+ contacts) with Excel export |
| **Companies** | Client, contractor, and supplier company registry |
| **Clients / Contractors / Suppliers** | Role-specific views linked to the company registry |
| **Admin** | User management, role permissions, and lookup tables |

**User Roles:**
- **Admin** — full access to all modules, including financials and user management
- **Engineer** — read-only access to projects; no access to financials or admin

---

### 2. Database (Supabase)
**Platform:** Supabase (PostgreSQL, hosted on AWS)
**Project ID:** rwokkfbwksmdcjcbyyhw

All application data is stored in Supabase. Key tables include: `projects`, `project_tasks`, `opportunities`, `invoices`, `purchase_orders`, `contacts`, `companies`, `clients`, `contractors`, `suppliers`, `tenders`, `profiles`, and `module_permissions`.

Supabase also handles:
- User authentication (email/password login, password reset)
- Role-based access control via the `profiles` table
- Database webhooks that trigger automated email alerts on new tenders

---

### 3. Tender Monitor (Automated Scraper)
**Purpose:** Checks the Nama iSupplier and OETC iSupplier portals for new tenders automatically.

**How it works:**
1. A script runs daily at 7:30am Dubai time on a dedicated cloud server
2. Any newly found tenders are saved to the Supabase database
3. A notification email is sent automatically to paul.winick@ids-gcc.com
4. The portal's Tender Monitoring page shows the last run status and allows on-demand "Run Now" triggers

**Cloud Server:** Oracle Cloud VM, UAE Central region (Abu Dhabi) — required because the Nama portal blocks non-UAE IP addresses.

---

## Code Repository (GitHub)
**Platform:** GitHub
**Repository:** github.com/idsgcc/ids_portal

All source code for the portal and scraper scripts is version-controlled here. Each change is committed with a descriptive message. This provides a full audit trail of every modification made to the system.

| Credential | Value |
|---|---|
| Username | _________________________ |
| Password / PAT | _________________________ |

---

## Hosting (Vercel)
**Platform:** Vercel
**Live URL:** https://ids-portal-gold.vercel.app/

The web portal is deployed via Vercel and updates automatically whenever code is pushed to the GitHub repository's main branch. No manual deployment steps are required for routine updates.

| Credential | Value |
|---|---|
| Username / Email | _________________________ |
| Password | _________________________ |

---

## Database (Supabase)
**Platform:** Supabase
**Dashboard:** supabase.com/dashboard/project/rwokkfbwksmdcjcbyyhw

The database dashboard allows viewing all tables, running queries, managing users, and monitoring usage.

| Credential | Value |
|---|---|
| Username / Email | _________________________ |
| Password | _________________________ |

---

## Security

| Component | Security Measures |
|---|---|
| **Web Portal** | All pages require authenticated login. Password reset via email. Role-based access control — engineers cannot see financials or admin tools. HTTPS enforced by Vercel. |
| **Database** | Supabase Row-Level Security (RLS) policies enforce access per user. The service-role key (full DB access) is stored only as a server-side environment variable — never exposed to the browser. Anon key has limited read permissions only. |
| **API Routes** | All Next.js API routes validate the authenticated session server-side before returning data. Unauthenticated requests return 401. |
| **Scraper API** | The Flask API on the cloud server is protected by a Bearer token. Requests without the correct token are rejected. |
| **Cloud Server** | SSH access is key-pair only (no password authentication). The private SSH key is held securely and is not committed to the code repository. |
| **Secrets** | All API keys, database credentials, and tokens are stored as environment variables — in Vercel's encrypted environment settings for the portal, and in the systemd service config on the VM. None are hardcoded in source code or committed to GitHub. |
| **Email Alerts** | Automated tender notifications and error alerts are sent via Resend (transactional email service). |

---

## Key Contacts & Dependencies

| Service | Provider | Purpose |
|---|---|---|
| Hosting | Vercel | Web portal deployment and CDN |
| Database | Supabase | PostgreSQL database, auth, and webhooks |
| Cloud VM | Oracle Cloud (UAE Central) | Runs the daily tender scraper |
| Email | Resend | Automated email notifications |
| Code | GitHub | Source code repository and version control |

---

## What Ongoing Maintenance Looks Like

- **No routine maintenance required** — the scraper runs on a schedule, the portal is always-on via Vercel, and Supabase is a managed database service.
- **Updates to the portal** — a developer pushes code to GitHub; Vercel automatically redeploys within ~1 minute.
- **If a scraper fails** — an error email is sent automatically. The scraper can also be re-run manually from the portal's Tender Monitoring page without any developer involvement.
- **Adding users** — done from the Admin page within the portal itself; no database access required.
- **Backups** — Supabase provides automated daily backups on the Pro plan.

---

*Document prepared August 2026. For technical questions, contact the development team.*
