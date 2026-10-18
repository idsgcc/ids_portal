'use strict';
const puppeteer = require('puppeteer-core');
const { createClient } = require('/Users/paulwinick/Documents/Projects/ids/portal/node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rwokkfbwksmdcjcbyyhw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORTAL_URL = 'https://ids-portal-gold.vercel.app';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = path.join(__dirname, 'screenshots');
const PDF_PATH = path.join(__dirname, '..', 'IDS_Operations_Portal_User_Guide.pdf');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Detail page URLs are resolved at runtime from Supabase
let PAGES = [
  { id: 'home',           url: '/',                   label: 'Home',                  section: null },
  { id: 'dashboard',      url: '/dashboard',           label: 'Dashboard',             section: 'Finance' },
  { id: 'invoices',       url: '/invoices',            label: 'Purchase Orders & Invoices', section: 'Finance' },
  { id: 'projects',       url: '/projects',            label: 'Project List',          section: 'Projects' },
  { id: 'project-detail', url: null,                   label: 'Project Detail',        section: 'Projects' },
  { id: 'calendar',       url: '/projects/calendar',   label: 'Project Calendar',      section: 'Projects' },
  { id: 'opportunities',  url: '/opportunities',       label: 'Opportunities',         section: 'Projects' },
  { id: 'tenders',        url: '/tenders',             label: 'Tender Monitoring',     section: 'Projects' },
  { id: 'employees',      url: '/employees',           label: 'Employees',             section: 'Employees' },
  { id: 'employee-detail',url: null,                   label: 'Employee Detail',       section: 'Employees' },
  { id: 'leave',          url: '/leave',               label: 'Employee Leave',        section: 'Employees' },
  { id: 'leave-requests', url: '/leave/requests',      label: 'Leave Requests',        section: 'Employees' },
  { id: 'companies',      url: '/companies',           label: 'Companies',             section: 'Contacts' },
  { id: 'company-detail', url: null,                   label: 'Company Detail',        section: 'Contacts' },
  { id: 'clients',        url: '/clients',             label: 'Clients',               section: 'Contacts' },
  { id: 'contractors',    url: '/contractors',         label: 'Contractors',           section: 'Contacts' },
  { id: 'suppliers',      url: '/suppliers',           label: 'Suppliers',             section: 'Contacts' },
  { id: 'contacts',       url: '/contacts',            label: 'Contacts',              section: 'Contacts' },
  { id: 'ai',             url: '/ai',                  label: 'AI Assistant',          section: 'Tools' },
  { id: 'admin',          url: '/admin',               label: 'Admin',                 section: 'Tools' },
];

async function resolveDetailUrls() {
  const { data: projects } = await supabase.from('projects').select('id').limit(1).single();
  const { data: employees } = await supabase.from('employees').select('id').limit(1).single();
  const { data: companies } = await supabase.from('companies').select('id').limit(1).single();
  if (projects) PAGES.find(p => p.id === 'project-detail').url = `/projects/${projects.id}`;
  if (employees) PAGES.find(p => p.id === 'employee-detail').url = `/employees/${employees.id}`;
  if (companies) PAGES.find(p => p.id === 'company-detail').url = `/companies/${companies.id}`;
  // Remove any pages whose URL is still null
  PAGES = PAGES.filter(p => p.url !== null);
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function screenshot(page, id) {
  const file = path.join(OUT_DIR, `${id}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function getSession() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  const user = users.users.find(u => u.email === 'paul.winick@ids-gcc.com') || users.users[0];
  if (!user) throw new Error('No users found');
  console.log('Generating magic link for:', user.email);

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
  });
  if (linkErr) throw linkErr;
  return { magicLink: linkData.properties.action_link, user };
}

function createChunks(key, value, chunkSize = 3180) {
  let encoded = encodeURIComponent(value);
  if (encoded.length <= chunkSize) return [{ name: key, value }];
  const chunks = [];
  while (encoded.length > 0) {
    let head = encoded.slice(0, chunkSize);
    const lastPct = head.lastIndexOf('%');
    if (lastPct > chunkSize - 3) head = head.slice(0, lastPct);
    let decoded = '';
    while (head.length > 0) {
      try { decoded = decodeURIComponent(head); break; }
      catch { head = head.slice(0, head.length - 3); }
    }
    chunks.push(decoded);
    encoded = encoded.slice(encodeURIComponent(decoded).length);
  }
  return chunks.map((v, i) => ({ name: `${key}.${i}`, value: v }));
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Resolving detail page URLs from Supabase...');
  await resolveDetailUrls();

  console.log('Generating magic link...');
  const { magicLink, user } = await getSession();

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { localStorage.setItem('theme', 'light'); });
  // Force light mode regardless of system preference
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);

  // Step 1: follow magic link to extract access/refresh tokens from hash fragment
  console.log('Following magic link to extract tokens...');
  await page.goto(magicLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1000);
  const redirectUrl = page.url();
  const hashPart = redirectUrl.includes('#') ? redirectUrl.substring(redirectUrl.indexOf('#') + 1) : '';
  const params = new URLSearchParams(hashPart);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresAt = parseInt(params.get('expires_at') || '0');
  const expiresIn = parseInt(params.get('expires_in') || '3600');
  if (!accessToken) throw new Error('No access_token in redirect: ' + redirectUrl);
  console.log('Got tokens. Expires at:', new Date(expiresAt * 1000).toISOString());

  // Step 2: construct the session cookie value that @supabase/ssr expects
  const session = {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: expiresAt,
    refresh_token: refreshToken,
    user,
  };
  const cookieKey = 'sb-rwokkfbwksmdcjcbyyhw-auth-token';
  const sessionStr = JSON.stringify(session);
  const chunks = createChunks(cookieKey, sessionStr);

  // Step 3: navigate to portal domain, then set the session cookies
  console.log(`Setting ${chunks.length} session cookie(s) on portal domain...`);
  await page.goto(PORTAL_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  for (const chunk of chunks) {
    await page.setCookie({
      name: chunk.name,
      value: chunk.value,
      domain: 'ids-portal-gold.vercel.app',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    });
  }

  // Step 4: navigate to home — should now be authenticated
  console.log('Navigating to authenticated portal...');
  await page.goto(PORTAL_URL + '/', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);
  console.log('Post-login URL:', page.url());

  const screenshots = {};

  for (const p of PAGES) {
    try {
      console.log(`Capturing: ${p.label}...`);
      await page.goto(PORTAL_URL + p.url, { waitUntil: 'networkidle0', timeout: 20000 });
      await sleep(1500);

      const file = await screenshot(page, p.id);
      screenshots[p.id] = file;
      console.log(`  Saved: ${file}`);
    } catch (err) {
      console.error(`  Failed ${p.id}:`, err.message);
    }
  }

  await browser.close();
  console.log('Browser closed. Building PDF...');

  await buildPDF(screenshots);
  console.log('Done! PDF saved to:', PDF_PATH);
}

function imgToBase64(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return 'data:image/png;base64,' + fs.readFileSync(filePath).toString('base64');
}

function sectionColor(section) {
  const map = {
    'Finance':   '#1d4ed8',
    'Projects':  '#15803d',
    'Employees': '#7c3aed',
    'Contacts':  '#b45309',
    'Tools':     '#0f766e',
  };
  return map[section] || '#374151';
}

async function buildPDF(screenshots) {
  const logoPath = '/Users/paulwinick/Documents/Projects/ids/portal/public/IDSLogo.png';
  const logoB64 = imgToBase64(logoPath);

  let sections = {};
  for (const p of PAGES) {
    if (p.section) {
      if (!sections[p.section]) sections[p.section] = [];
      sections[p.section].push(p);
    }
  }

  // Build HTML
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; background: white; }

  /* Cover page */
  .cover {
    width: 100%; height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: #0f172a;
    page-break-after: always;
    text-align: center;
    padding: 60px;
  }
  .cover img { width: 260px; margin-bottom: 48px; filter: brightness(1.1); }
  .cover h1 { font-size: 38px; font-weight: 700; color: #f8fafc; letter-spacing: -0.5px; margin-bottom: 12px; }
  .cover .sub { font-size: 18px; color: #94a3b8; margin-bottom: 48px; }
  .cover .meta { font-size: 14px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 24px; }

  /* TOC */
  .toc { padding: 60px 80px; page-break-after: always; }
  .toc h2 { font-size: 28px; font-weight: 700; color: #0f172a; margin-bottom: 32px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
  .toc-section { margin-bottom: 24px; }
  .toc-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; margin-bottom: 8px; }
  .toc-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #374151; border-bottom: 1px dotted #e5e7eb; }
  .toc-item span:last-child { color: #9ca3af; }

  /* Section divider page */
  .section-break {
    width: 100%; height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    page-break-before: always; page-break-after: always;
    text-align: center;
  }
  .section-break .badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; padding: 6px 16px; border-radius: 99px; margin-bottom: 20px; }
  .section-break h2 { font-size: 48px; font-weight: 800; margin-bottom: 16px; }
  .section-break p { font-size: 18px; color: #6b7280; max-width: 480px; line-height: 1.6; }

  /* Content page */
  .page { padding: 48px 60px; page-break-before: always; }
  .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
  .page-header-left { display: flex; flex-direction: column; gap: 4px; }
  .page-section-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; }
  .page-title { font-size: 26px; font-weight: 700; color: #0f172a; }
  .page-logo { height: 36px; opacity: 0.7; }
  .screenshot { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: block; }
  .description { margin-top: 24px; font-size: 14px; line-height: 1.75; color: #4b5563; }
  .description h3 { font-size: 15px; font-weight: 600; color: #1f2937; margin-bottom: 8px; margin-top: 16px; }
  .description ul { padding-left: 20px; }
  .description li { margin-bottom: 4px; }
  .tips-box { margin-top: 16px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 6px 6px 0; padding: 12px 16px; }
  .tips-label { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #b45309; margin-bottom: 6px; }
  .tips-box ul { padding-left: 18px; margin: 0; }
  .tips-box li { color: #78350f; margin-bottom: 4px; font-size: 13px; }

  /* Footer on every page */
  @page { margin: 0; }
  @media print {
    .cover, .toc, .section-break, .page { min-height: 100vh; }
  }
</style>
</head>
<body>
`;

  // Cover
  html += `
<div class="cover">
  ${logoB64 ? `<img src="${logoB64}" alt="IDS Logo"/>` : '<div style="color:#f97316;font-size:32px;font-weight:800;margin-bottom:48px">IDS</div>'}
  <h1>IDS Operations Portal</h1>
  <p class="sub">Internal User Guide</p>
  <p class="meta">IDS-GCC Gulf Region Operations &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; October 2026</p>
</div>
`;

  // TOC
  const sectionDescriptions = {
    'Finance':   ['Dashboard', 'Purchase Orders & Invoices'],
    'Projects':  ['Project List', 'Project Detail', 'Project Calendar', 'Opportunities', 'Tender Monitoring'],
    'Employees': ['Employees', 'Employee Detail', 'Employee Leave', 'Leave Requests'],
    'Contacts':  ['Companies', 'Company Detail', 'Clients', 'Contractors', 'Suppliers', 'Contacts'],
    'Tools':     ['AI Assistant', 'Admin'],
  };

  html += `<div class="toc">
  <h2>Table of Contents</h2>
`;
  for (const [sec, items] of Object.entries(sectionDescriptions)) {
    const color = sectionColor(sec);
    html += `
  <div class="toc-section">
    <div class="toc-section-title" style="color:${color}">${sec}</div>
    ${items.map(item => `<div class="toc-item"><span>${item}</span></div>`).join('')}
  </div>`;
  }
  html += `</div>`;

  // Section descriptions
  const sectionDesc = {
    'Finance':   'Financial overview, project revenue tracking, purchase orders and invoice management across all currencies.',
    'Projects':  'Post-award project tracking, milestone management, calendar views, opportunity pipeline, and live tender monitoring.',
    'Employees': 'Employee records, document management, leave entitlements, and leave request workflows.',
    'Contacts':  'Company directory, client and contractor management, supplier records, and contact book.',
    'Tools':     'AI-powered data assistant and administrative configuration.',
  };

  // Page descriptions — desc, points (key features), tips (practical guidance)
  const pageDesc = {
    'home': {
      desc: 'The Home screen is your starting point for the IDS Operations Portal. It organises every module into four functional groups — Finance, Projects, Employees, and Contacts — so you can navigate directly to the area you need without going through menus. The portal is role-based: your account will only show the modules your role has permission to access.',
      points: [
        'Click any tile to jump straight to that module',
        'Modules are grouped by function: Finance, Projects, Employees, Contacts',
        'Your name and role are shown in the top-right header',
        'Use the Menu dropdown in the header to navigate from any page',
        'The version number (e.g. v0.1.2) is shown next to your name for reference',
        'The moon icon in the header toggles between light and dark mode',
      ],
      tips: [
        'Bookmark the portal URL — logging in via the link in your welcome email will always redirect you here',
        'If a module is missing from your home screen, contact your administrator to check your role permissions',
      ],
    },
    'dashboard': {
      desc: 'The Dashboard gives a live, at-a-glance view of the health of the business across projects, opportunities, and finance. It is the first place to check each morning to understand what needs attention — overdue invoices are highlighted in red, and project statuses give an immediate sense of where delivery risk lies. All figures update in real time from the database.',
      points: [
        'On Track Projects: active projects with "On Track" status vs. total project count',
        'Open Opportunities: total bids and prospects currently in progress',
        'Invoices Outstanding: total value of unpaid client invoices, shown in AED and OMR',
        'Overdue Invoices: count and value of invoices past their due date (shown in red)',
        'Projects breakdown: Upcoming / On Track / At Risk / Completed counts',
        'Opportunities breakdown: In Progress / Awarded / Lost / Cancelled, plus win rate and awards this month',
        'Finance section: outstanding invoice totals by currency',
        '"View all →" links on each section take you directly to the relevant module',
      ],
      tips: [
        'The overdue invoice count is the most time-sensitive figure — check it first thing each day',
        'A win rate below 20% over consecutive months may indicate a need to review the opportunity pipeline quality',
        'The dashboard does not auto-refresh — reload the page to get the latest figures',
      ],
    },
    'invoices': {
      desc: 'Purchase Orders & Invoices gives a complete financial picture of money flowing in and out of IDS across all active projects. All amounts are converted to AED in real time using daily exchange rates from the European Central Bank, making it easy to compare values across currencies (AED, OMR, EUR, USD). There are four distinct financial flows tracked here, each representing a different stage of the revenue and cost cycle.',
      points: [
        'POs Received from Client (green) — Approved or closed purchase orders issued to IDS by clients. Represents contracted revenue authorised by the client',
        'Invoices Issued — Money In (blue) — Client invoices with status Submitted or Paid. Represents money in or expected in',
        'POs Issued to Supplier (orange) — Approved or closed purchase orders IDS has sent to suppliers. Represents committed third-party spend',
        'Invoices Received — Money Out (purple) — Supplier invoices with status Received or Paid. Represents money out or owed to suppliers',
        'Click "▾ Details" on any box to expand and see the individual records that make up that total',
        'All totals are converted to AED using live ECB exchange rates updated daily',
      ],
      tips: [
        'The gap between "POs Received from Client" and "Invoices Issued" shows how much contracted revenue has not yet been billed — this is your uninvoiced backlog',
        'If "Invoices Received — Money Out" is growing faster than "Invoices Issued — Money In", cash flow may need attention',
        'Exchange rates are fetched once per day; for exact spot-rate figures, cross-reference with your bank',
      ],
    },
    'projects': {
      desc: 'The Projects list is the master view of all post-award projects currently being delivered by IDS. Each row shows where a project stands in its lifecycle at a glance — status, priority, current milestone, and next milestone — so you can identify blockers and overdue items without opening individual projects. Projects are tracked from award through to commissioning and handover.',
      points: [
        'Search bar filters by project name or code in real time',
        'Status dropdown filters by On Track, At Risk, Upcoming, or Completed',
        '"Overdue Tasks" button filters to projects with at least one task past its finish date',
        '"Overdue Invoices" button filters to projects with outstanding overdue client invoices',
        'Current Step column shows the active milestone with the assigned team member if set',
        'Next Step column shows what comes after the current milestone',
        'Overdue Invoices column shows the invoice amount outstanding in red if applicable',
        '"New Project" button creates a new project record',
        '"Calendar" button switches to the timeline view of key dates',
        'Status and Priority can be updated directly from the list using the inline dropdowns — no need to open the project',
      ],
      tips: [
        'Use the "Overdue Tasks" filter at the start of each week to quickly identify which projects need chasing',
        'Priority (Low / Medium / High) can be updated by clicking the priority badge directly in the list — useful for a quick reprioritisation session',
        'Project names follow the IDS naming convention: I[number] [Client code] [Site] [Technology] e.g. "I1748 OETC 49 Majan DWDM"',
      ],
    },
    'project-detail': {
      desc: 'The Project Detail page shows the complete task breakdown for a single project, organised into delivery phases. It is the main workspace for tracking day-to-day progress. Each phase (e.g. Kickoff, Documentation, Manufacturing, Installation, Testing) contains its own list of tasks with individual statuses, durations, dates, and assignees. The progress bar at the top reflects how many tasks have been marked Completed out of the total.',
      points: [
        'Progress bar and percentage in the top-right shows overall task completion (e.g. 27% = 6/22 tasks done)',
        'Status badge (On Track / At Risk) and Priority badge are editable via dropdown directly on this page',
        'Project metadata: client name, contract type (L&T / Supply Only), and award date',
        'Tasks are grouped by phase — e.g. Kickoff, Documentation and Design, Manufacturing, FAT, Shipping, Installation, Commissioning',
        'Each task shows: Status (Completed / In Progress / Not Started), Task name, Duration (days), Start date, Finish date, Assigned team member',
        '"Remind" button sends an email reminder for that specific task to the assigned person',
        '"+ Add task" at the bottom of each phase adds a new task to that phase',
        'Drag the ⠿ handle on the left of any task to reorder tasks within a phase',
      ],
      tips: [
        'Update task statuses regularly — the project list and dashboard pull live from these statuses',
        'Set Start and Finish dates on tasks to unlock the calendar view for that project\'s key milestones',
        'Use the Assignee field to track ownership — assigned tasks will appear in that person\'s reminder emails',
        'If a task is marked "In Progress" for more than its expected duration, it will appear in the Overdue Tasks filter on the project list',
      ],
    },
    'calendar': {
      desc: 'The Project Calendar aggregates important dates from across all projects into a single chronological timeline. It shows three types of events side by side: task finish dates (when a project milestone is due), client invoice due dates (when IDS needs to be paid), and supplier invoice due dates (when IDS owes a supplier). This makes it easy to see pressure points — weeks where multiple deadlines or payment obligations coincide.',
      points: [
        'Day / Week / Month view toggles in the top-right to change the density of the view',
        'Events are colour-coded: Task finish dates (blue), Client invoice due (orange), Supplier invoice due (yellow)',
        'Each event shows the date, project or invoice reference, and the amount (for invoices)',
        'Past events are collapsed into a "PAST (n)" count — click "show" to expand them',
        'Events are grouped by week — the date range for each week is shown as a header',
        '"+ Add event" creates a custom one-off calendar event not tied to a task or invoice',
        'Clicking a project name in an event navigates to that project\'s detail page',
      ],
      tips: [
        'Check this page at the start of each month to identify any weeks with unusually high invoice volumes or multiple task deadlines',
        'If a task finish date is showing in a past week and the task is not yet complete, it will also appear in the Overdue Tasks filter on the project list — fix it there',
        'Custom events added via "+ Add event" are shared across all users — use them sparingly for team-wide milestones',
      ],
    },
    'opportunities': {
      desc: 'Opportunities tracks every active bid, prospect, and potential project before it is awarded and becomes a formal project. Each opportunity represents a piece of work IDS is pursuing — from initial enquiry through to award or loss. The pipeline currently contains around 700 active opportunities, giving a view of future revenue potential. Once an opportunity is awarded, a new Project record is created to take over tracking.',
      points: [
        'Search bar filters by opportunity name, client, contractor, or any notes text',
        'Client filter dropdown narrows the list to a specific client company',
        'Status filter: In Progress (active bid), Awarded (won), Lost, Cancelled',
        'Columns: Opportunity reference and name, Client, Contractor, Close Date (expected decision date), Status',
        'Opportunities are sorted by reference number (newest first) by default',
        '"Add Opportunity" creates a new opportunity record',
        'Clicking an opportunity row opens the detail view where notes, documents, and stage updates can be logged',
      ],
      tips: [
        'The win rate shown on the Dashboard is calculated from this module — keeping statuses up to date (especially marking Lost and Cancelled) ensures accurate reporting',
        'The "Close Date" field is the expected client decision date — update it regularly as timelines shift',
        'Use the notes field within an opportunity to log any client communications, clarification meetings, or pricing decisions for future reference',
      ],
    },
    'tenders': {
      desc: 'Tender Monitoring automatically tracks live tenders published on the Nama and OETC iSupplier portals — two of IDS\'s main client procurement platforms. The scraper runs on a cloud server in the UAE twice daily and saves any newly published tenders to the portal database. When a new tender is found, an email notification is sent automatically to the IDS team. This page gives you visibility into the scraper\'s status and lets you trigger an on-demand run if needed.',
      points: [
        'Nama Scraper: monitors the Nama Electricity Distribution iSupplier portal for new tenders',
        'OETC Scraper: monitors the Oman Electricity Transmission Company iSupplier portal',
        'Both scrapers run automatically at 7:30am and 2:30pm Dubai time, 7 days a week',
        '"Last run" shows the most recent scrape time, how many new tenders were found, and total found',
        '"Next run" shows when the next automatic scrape is scheduled',
        '"Run Now" button triggers an immediate on-demand scrape — useful if you\'ve heard a tender may have just been published',
        '"Show recent runs (10)" expands a log of the last 10 scrape events with timestamps and results',
        '"Portal ↗" link opens the relevant iSupplier portal directly in a new tab so you can view tender documents',
      ],
      tips: [
        'New tenders generate an automatic email notification — you don\'t need to check this page daily unless you want to confirm the scraper is running',
        '"Run Now" is useful on days when you\'re expecting a specific tender to drop — check the portal link directly to confirm and use "Run Now" to force an immediate import',
        'If the scraper shows an error or "Last run" is more than 12 hours old, the cloud server may need attention — contact your system administrator',
      ],
    },
    'employees': {
      desc: 'The Employees module holds the personnel records for all current IDS staff. It provides a quick overview of the team and serves as the entry point for managing individual employee profiles, document tracking, and leave entitlements. The document status indicator on each card lets you see at a glance which employees have upcoming visa, passport, or Emirates ID expiries that need attention.',
      points: [
        'Active employees are shown as cards in a grid — each card shows initials avatar, full name, and join date',
        '"docs" indicator in the top-right of each card: green dot = all documents valid, red dot = one or more documents expiring within 60 days or already expired',
        'Click any employee card to open their full detail page',
        '"Add Employee" button in the top-right creates a new employee record',
        'Employee count shown as "ACTIVE (n)" above the grid',
      ],
      tips: [
        'Check red "docs" indicators regularly — passport and visa renewals often require 3–6 months lead time for some nationalities',
        'When a new employee joins, add their record here first, then add their documents (passport, visa, EID) on the detail page',
        'Former employees are not deleted but archived — they do not appear in the active list',
      ],
    },
    'employee-detail': {
      desc: 'The Employee Detail page holds the complete HR record for an individual staff member — personal information, identity documents, and visa status. Expiry dates are colour-coded to give immediate visibility: green means valid, orange means expiring within 60 days, and red means expired or critically close. This page is particularly important for HR compliance, as all UAE and Oman employees must maintain valid residency documentation.',
      points: [
        'Header card: full name, initials avatar, date of birth, join date (orange if within first 3 months of service), country flag, and sick leave entitlement (days per year)',
        'Passport section: document number and expiry date with colour-coded status',
        'Emirates ID section: ID number and expiry date with colour-coded status',
        'Visa section: file number and expiry date with colour-coded status',
        'Health Insurance section: policy number, insurer, and expiry',
        'Labour Card / Work Permit section (where applicable)',
        '"Edit Employee" button at the bottom opens the edit form to update any field',
        '"Delete Employee" permanently removes the record — use with caution',
      ],
      tips: [
        'Green expiry = valid (more than 60 days remaining), Orange = expiring within 60 days, Red = expired or within 30 days',
        'Always update passport numbers and expiry dates when employees renew their documents — this feeds the leave and HR compliance reports',
        'The sick leave entitlement (e.g. 15d / yr) is set per country and determines how sick leave is calculated in the Leave module',
      ],
    },
    'leave': {
      desc: 'The Employee Leave page is the main HR dashboard for annual leave management. It shows two things: the bank holiday calendar for the year (covering both UAE and Oman public holidays relevant to the IDS team), and a summary table of each employee\'s leave balance. The balance table shows how many days of annual leave each person has taken, how many remain, and any sick, WFH, or unpaid leave recorded for the year.',
      points: [
        'Bank Holidays section at the top: UAE and Oman holidays shown as colour-coded pills for the current year',
        'Navigate between years using the ◄ ► arrows next to the year label',
        'Employee table columns: Name, Annual Period (the leave year for that employee), Used (days taken), Remaining (days left — colour-coded green/orange/red), Sick, WFH, Unpaid, Ticket (flight ticket status)',
        'Green remaining = ample leave remaining, Orange = running low, Red = over-entitlement or exceeded',
        '"+ Add Holiday" button adds a new public holiday to the bank holiday calendar',
        '"Leave Requests →" button in the top-right navigates to the Leave Requests approval page',
        'Employees with "No entitlement" shown have not yet had a leave year configured for them',
      ],
      tips: [
        'Leave entitlements are set per employee on the Leave Requests page — if an employee shows "No entitlement", their annual leave period needs to be created',
        'UAE and Oman public holidays are pre-loaded but should be updated annually as official dates are confirmed (Islamic holidays in particular shift each year)',
        'The Ticket column tracks whether an employee\'s annual flight home has been issued — update this when tickets are booked',
      ],
    },
    'leave-requests': {
      desc: 'Leave Requests is the workflow for submitting and approving employee leave. When a staff member requests time off, their request appears here under the Pending tab for a manager to approve or reject. Once approved, the leave is deducted from their balance on the Employee Leave page and appears as a coloured bar on the year calendar at the top of this page. The calendar gives a visual overview of who is away and when, helping managers plan around absences.',
      points: [
        'Year calendar at the top: horizontal bar chart showing each employee\'s approved leave as a coloured bar across the calendar year. Each employee has a distinct colour. Dots at the end of bars indicate leave extending beyond the visible range',
        'Navigate years with the ◄ ► arrows. "Hide" collapses the calendar to save space',
        'Tabs: Pending (requires action), Approved (2), Rejected, All (2) — counts shown in brackets',
        'Pending tab: shows requests awaiting approval with employee name, leave type, dates, duration, and reason',
        'Approve or Reject buttons on each pending request',
        '"+ New Request" creates a leave request on behalf of an employee (for manager-initiated submissions)',
        'Leave types: Annual Leave, Sick Leave, WFH, Unpaid Leave',
        'Approved requests automatically deduct from the employee\'s remaining balance',
      ],
      tips: [
        'Check the Pending tab at the start of each week — requests left pending too long can cause scheduling conflicts',
        'Use the year calendar to check for overlap before approving — if multiple team members are requesting the same dates, the calendar makes conflicts immediately visible',
        'Rejected requests are kept in the Rejected tab for audit purposes — include a reason when rejecting so the employee understands',
      ],
    },
    'companies': {
      desc: 'Companies is the master directory of every organisation IDS interacts with — clients, contractors, and suppliers all live here in a single searchable list. This is the source of truth for company information used across the portal: when you assign a client to a project or link a contractor to an opportunity, the name comes from this directory. A company can hold multiple type tags at once (e.g. a firm can be both a Contractor and a Supplier).',
      points: [
        'Search bar filters in real time across company name, city, country, phone number, and website URL',
        'Type filter buttons (Client / Contractor / Supplier) narrow the list to companies with that classification',
        'Each row shows: coloured avatar with initials, company name, type tag(s), website (clickable), city, country, and phone number',
        'Total company count shown in the page subtitle (e.g. "683 companies")',
        '"Add Company" button creates a new company record',
        'Click any row to open the company detail page',
        'Companies without a website or phone show "—" in those columns',
      ],
      tips: [
        'Before adding a new company, search for it first — duplicate company records are a common issue that leads to inconsistencies across modules',
        'Type tags are not mutually exclusive — set all that apply (e.g. a supplier who also acts as a contractor on some projects)',
        'The Clients, Contractors, and Suppliers pages in the menu are filtered shortcuts to this same data — changes made in any of them are reflected here',
      ],
    },
    'company-detail': {
      desc: 'The Company Detail page shows all information held for a specific organisation and lists all individual contacts associated with it. It serves as the link between a company and its people — when a contact is added with a company linked, they appear in this Contacts section. The type tags (Client, Contractor, Supplier) at the top can be toggled directly on this page to update a company\'s classification.',
      points: [
        'Company logo/avatar, name, and city/country shown in the header',
        'Type tags (e.g. CLIENT, CONTRACTOR, SUPPLIER) shown as coloured badges — click + to add a type, × to remove one',
        'Contact details: phone number (clickable to dial), website (clickable link), street address, city, country, and postal code',
        'Contacts section: lists all individual people linked to this company, showing their name, title, email, and mobile number',
        '"Edit Company" button opens the edit form to update any company details',
        '"Delete Company" permanently removes the record — contacts linked to this company are not deleted but will lose their company association',
      ],
      tips: [
        'To add a new contact for this company, go to Contacts → Add Contact and select this company from the dropdown',
        'Keeping the website and phone number up to date here ensures the Contacts directory stays accurate — these fields are shown in search results',
        'If a company no longer works with IDS, consider removing its type tags rather than deleting the record entirely, to preserve the history',
      ],
    },
    'clients': {
      desc: 'Clients is a focused view of the Companies directory showing only organisations that IDS directly delivers projects for. These are the end customers — government entities, utilities, and enterprises that have contracted IDS to carry out telecom or infrastructure work. The Clients list is used when assigning a client to a project or opportunity and is maintained here.',
      points: [
        'Shows only companies tagged as "Client" — currently 244 active client companies',
        'Search by name, contact name, or country',
        'Each row shows: company avatar, name, and country',
        'Click any row to open the company detail page for that client',
        '"Add Client" creates a new client company record and tags it as a Client',
        'Changes made here are reflected in the main Companies directory and vice versa',
      ],
      tips: [
        'Major IDS clients include OETC (Oman Electricity Transmission Company), Nama Electricity Distribution, Etihad WE, and PDO — these appear frequently across projects and opportunities',
        'If a client also supplies equipment or subcontracts to IDS, add the Supplier or Contractor tag to their record in the Companies directory — they will then appear in those lists too',
      ],
    },
    'contractors': {
      desc: 'Contractors lists the telecom companies and main contractors that IDS works under as a subcontractor. These are the firms that hold the prime contracts from clients and engage IDS to deliver the technical scope. Each contractor may be aligned to a specific "Principal" — the client entity (e.g. OETC or NEDC) that their work is ultimately for.',
      points: [
        'Shows only companies tagged as "Contractor" — currently 321 active contractor records',
        'Search by company name, contact name, email, phone number, or principal',
        'Columns: company avatar, name, Principal (the client entity they work under), and country',
        '"Add Contractor" creates a new contractor record',
        'The Principal field links to the Client Entities lookup configured in Admin',
        'Click any row to open the contractor\'s full company detail page',
      ],
      tips: [
        'Key IDS contractors include L&T (Larsen & Toubro), CCC, and various regional telecom integrators',
        'The Principal field is important for filtering and reporting — always set it when adding a new contractor so opportunities and projects can be filtered by principal',
        'A contractor company may also appear in the Clients list if IDS directly delivers projects for them',
      ],
    },
    'suppliers': {
      desc: 'Suppliers lists the hardware and equipment vendors that IDS sources from for project delivery. These range from manufacturers of DWDM and MPLS equipment to cable suppliers and civil contractors. Suppliers must go through an approval process before being used on projects — the Approved / Pending status field tracks this.',
      points: [
        'Shows only companies tagged as "Supplier" — currently 276 approved suppliers',
        'Search by company name, product category, country, or contact name',
        'Columns: company avatar, name, Category (product type), Status (Approved / Pending / Inactive), and country',
        '"Add Supplier" creates a new supplier record',
        'Status is set to Pending by default for new suppliers and changed to Approved after vetting',
        'Click any row to open the supplier\'s full company detail page',
      ],
      tips: [
        'Major equipment suppliers include ABB, Fiberhome, Huawei, and Nokia — these appear most frequently on DWDM and MPLS projects',
        'Always check the Approved status before committing to a new supplier on a project — using a non-approved supplier may create compliance issues',
        'The Category field is used to quickly find suppliers by product type (e.g. "Fiber Optic", "Power Systems", "Civil Works")',
      ],
    },
    'contacts': {
      desc: 'Contacts is the global address book — a searchable directory of all individual people IDS interacts with across every client, contractor, and supplier organisation. With over 1,100 contacts, it is the go-to place to look up a phone number, email address, or job title. Contacts are linked to their company, so clicking through to a contact shows their organisation, and the Company Detail page shows all contacts linked to that firm.',
      points: [
        'Search in real time across name, company name, job title, phone number, and email address',
        'Columns: avatar with initials, name, company (linked), title, phone, mobile, and email',
        '"Add Contact" button creates a new person record',
        '"Export ↓" downloads the entire contacts list as a CSV file — useful for mail merges or sharing with external systems',
        'Total contact count shown in the subtitle (e.g. "1,148 contacts")',
        'Click any row to open the contact\'s detail page',
        'Contacts without a company association are still searchable and appear in results',
      ],
      tips: [
        'When adding a new contact, always link them to a company using the Company field — this keeps the directory organised and enables the company-contact relationship to work both ways',
        'The Export function produces a clean CSV with all columns — use it to prepare mailing lists or populate external CRM systems',
        'If you find duplicate contacts, open both records and delete the one with less information — there is no automated merge tool',
      ],
    },
    'ai': {
      desc: 'The AI Assistant is powered by Google Gemini and has read access to the live portal data — projects, opportunities, invoices, employees, and contacts. You can ask it questions in plain English and it will query the database and respond with a summary or analysis. It is useful for quick lookups, summaries, and cross-module questions that would otherwise require navigating multiple pages.',
      points: [
        'Type any question in the input box at the bottom and press Enter (or Shift+Enter for a new line)',
        'Suggested prompts appear on the empty screen to help you get started: "Which projects are currently active?", "Are there any overdue invoices?", "What opportunities are closing soon?", "Which projects have the highest priority?"',
        'The assistant can answer questions across all modules: projects, tasks, opportunities, invoices, employees, and contacts',
        'Responses include the data it found along with a plain-English interpretation',
        'Previous messages in the conversation are kept for follow-up questions',
        'Press Shift+Enter to add a new line to your message without sending it',
      ],
      tips: [
        'Be specific in your questions — "Which projects have overdue tasks assigned to Ramees?" will return better results than "What\'s overdue?"',
        'The assistant cannot modify data — it is read-only. Use it for lookups and summaries, not for making changes',
        'For complex analysis (e.g. "summarise all invoices from Supplier X in Q3"), the AI assistant is much faster than manually navigating the finance module',
        'If the response seems incorrect or incomplete, try rephrasing — specifying a date range or project name usually helps narrow the results',
      ],
    },
    'admin': {
      desc: 'The Admin panel is for system configuration and user management. It is restricted to users with the Admin role. Here you can manage the lookup values that appear as dropdown options across the portal, control which users have access to which modules, and configure financial settings. Changes made in Admin take effect immediately across the portal.',
      points: [
        'Lookups tab: manage reference data used in dropdowns across the portal — Client Entities (Principals) such as OETC and NEDC, and Contractor Specializations such as Fiber Optic Networks, Power Systems, and Civil Works',
        'Users tab: view all portal user accounts, their email addresses, and their assigned roles (Admin, Manager, Staff, etc.)',
        'Module Permissions tab: configure which roles have access to which modules — if a user cannot see a module, check their role here first',
        'Finance tab: configure financial settings such as default currency and exchange rate behaviour',
        'Changes to Lookups take effect immediately in dropdown menus across the portal',
        'New user accounts are created via Supabase auth (email invite) — the Users tab shows existing accounts only',
      ],
      tips: [
        'Only Admins can access this page — if a team member needs admin access, update their role in the Users tab',
        'Before adding a new Contractor Specialization, check whether a similar one already exists — the list should be kept concise to be useful as a filter',
        'Module Permissions are role-based, not user-based — changing a role\'s permissions affects every user with that role simultaneously',
        'If a user reports that a module has disappeared from their menu, check Module Permissions first — a permission may have been accidentally removed',
      ],
    },
  };

  // Render section breaks + pages
  let prevSection = null;
  for (const p of PAGES) {
    if (p.id === 'home') {
      // Home page - no section break
      const b64 = imgToBase64(screenshots[p.id]);
      const info = pageDesc[p.id];
      html += `
<div class="page">
  <div class="page-header">
    <div class="page-header-left">
      <div class="page-section-tag" style="color:#374151">GETTING STARTED</div>
      <div class="page-title">${p.label}</div>
    </div>
    ${logoB64 ? `<img class="page-logo" src="${logoB64}" alt="IDS"/>` : ''}
  </div>
  ${b64 ? `<img class="screenshot" src="${b64}" alt="${p.label}"/>` : '<div style="height:400px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#9ca3af">Screenshot unavailable</div>'}
  <div class="description">
    <p>${info.desc}</p>
    ${info.points.length ? `<h3>Key Features</h3><ul>${info.points.map(pt => `<li>${pt}</li>`).join('')}</ul>` : ''}
    ${info.tips && info.tips.length ? `<div class="tips-box"><span class="tips-label">Tips</span><ul>${info.tips.map(t => `<li>${t}</li>`).join('')}</ul></div>` : ''}
  </div>
</div>`;
      continue;
    }

    if (p.section && p.section !== prevSection) {
      const color = sectionColor(p.section);
      const bgMap = {
        'Finance':   '#eff6ff',
        'Projects':  '#f0fdf4',
        'Employees': '#faf5ff',
        'Contacts':  '#fffbeb',
        'Tools':     '#f0fdfa',
      };
      const bg = bgMap[p.section] || '#f9fafb';
      html += `
<div class="section-break" style="background:${bg}">
  <div class="badge" style="background:${color};color:white">${p.section}</div>
  <h2 style="color:${color}">${p.section}</h2>
  <p>${sectionDesc[p.section]}</p>
</div>`;
      prevSection = p.section;
    }

    const b64 = imgToBase64(screenshots[p.id]);
    const info = pageDesc[p.id] || { desc: '', points: [] };
    const color = sectionColor(p.section);

    html += `
<div class="page">
  <div class="page-header">
    <div class="page-header-left">
      <div class="page-section-tag" style="color:${color}">${p.section}</div>
      <div class="page-title">${p.label}</div>
    </div>
    ${logoB64 ? `<img class="page-logo" src="${logoB64}" alt="IDS"/>` : ''}
  </div>
  ${b64 ? `<img class="screenshot" src="${b64}" alt="${p.label}"/>` : '<div style="height:400px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#9ca3af">Screenshot unavailable</div>'}
  <div class="description">
    <p>${info.desc}</p>
    ${info.points.length ? `<h3>Key Features</h3><ul>${info.points.map(pt => `<li>${pt}</li>`).join('')}</ul>` : ''}
    ${info.tips && info.tips.length ? `<div class="tips-box"><span class="tips-label">Tips</span><ul>${info.tips.map(t => `<li>${t}</li>`).join('')}</ul></div>` : ''}
  </div>
</div>`;
  }

  html += `</body></html>`;

  // Save HTML for debugging
  const htmlPath = path.join(__dirname, 'guide.html');
  fs.writeFileSync(htmlPath, html);
  console.log('HTML saved:', htmlPath);

  // Render to PDF
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
