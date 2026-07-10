# IDS Operations Project

Internal tooling for IDS-GCC (Gulf region operations).

## Architecture

### Nama Tender Monitor
Scrapes the Nama iSupplier portal (https://isupplier.nama.om:4443) for new tenders and saves them to Supabase. The portal blocks external IPs, so scraping runs on an Oracle Cloud VM in UAE.

**Flow:**
1. Oracle Cloud VM (cron 3:30am UTC / 7:30am Dubai) → scrapes portal → saves new tenders to Supabase
2. Supabase Database Webhook → Edge Function → Resend email to paul.winick@ids-gcc.com
3. Web portal → "Run Now" button → calls Flask API on VM → triggers scraper on demand

### Web Portal
Next.js + Tailwind app at `/portal`. Dev server: `cd portal && npm run dev`.

## Oracle Cloud VM
- **IP:** 129.151.129.121
- **User:** opc
- **SSH key:** `/Users/paulwinick/Projects/ids/ssh-key-2026-07-02.key` (not committed)
- **SSH:** `ssh -i /Users/paulwinick/Projects/ids/ssh-key-2026-07-02.key -o StrictHostKeyChecking=no opc@129.151.129.121`
- **Region:** UAE Central (Abu Dhabi) / me-abudhabi-1
- **Scripts on VM:** `~/nama_monitor.py`, `~/scraper_api.py`
- **Log:** `~/nama_monitor.log`

## Flask API (on VM)
- **Endpoint:** `POST http://129.151.129.121:8080/run-scraper`
- **Health:** `GET http://129.151.129.121:8080/health`
- **Auth:** `Authorization: Bearer <SCRAPER_TOKEN>` (see `.env.local`)
- **Systemd service:** `scraper-api` (enabled, starts on reboot)

## Supabase
- **Project:** rwokkfbwksmdcjcbyyhw
- **Tables:** `tenders`, `scraper_log`, `projects`, `project_plans`, `project_tasks`, `task_templates`, `template_tasks`, `employees`, `contractors`

## Key Files
| File | Purpose |
|------|---------|
| `nama_monitor.py` | Scraper — runs on VM, saves tenders to Supabase |
| `scraper_api.py` | Flask API on VM — exposes `/run-scraper` endpoint |
| `schema.sql` | Supabase database schema |
| `portal/` | Next.js web portal |
| `portal/.env.local` | Secrets (not committed) |

## Deploying Script Changes to VM
```bash
scp -i /Users/paulwinick/Projects/ids/ssh-key-2026-07-02.key -o StrictHostKeyChecking=no \
  /Users/paulwinick/Projects/ids/nama_monitor.py opc@129.151.129.121:~/nama_monitor.py
```
