import { ReactNode } from "react";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

function IconBuilding() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12.01"/><path d="M8 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>
    </svg>
  );
}

function IconUsers() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14l2 2 4-4"/>
    </svg>
  );
}

function IconFolders() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M2 10h20"/>
    </svg>
  );
}

function IconTruck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
    </svg>
  );
}

function IconAddressBook() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6h2"/><path d="M2 10h2"/><path d="M2 14h2"/><path d="M2 18h2"/>
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <circle cx="12" cy="10" r="3"/>
      <path d="M7 20c0-2.21 2.24-4 5-4s5 1.79 5 4"/>
    </svg>
  );
}

function IconOfficeBuilding() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/><path d="M7 6h.01M12 6h.01M17 6h.01M7 12h.01M12 12h.01M17 12h.01M7 16h.01M12 16h.01M17 16h.01"/>
    </svg>
  );
}

function IconUserCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>
    </svg>
  );
}

function IconChart() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
}

function IconReceipt() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
      <path d="M16 8H8"/><path d="M16 12H8"/><path d="M12 16H8"/>
    </svg>
  );
}

function IconTarget() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>
    </svg>
  );
}

const ALL_SECTIONS: { heading: string; cards: { href: string; title: string; description: string; icon: ReactNode; module: string }[] }[] = [
  {
    heading: "Finance",
    cards: [
      { href: "/dashboard", title: "Dashboard", description: "High-level overview of projects, opportunities, and finance.", icon: <IconChart />, module: "dashboard" },
      { href: "/invoices", title: "Invoices", description: "Invoices paid and outstanding across all projects.", icon: <IconReceipt />, module: "invoices" },
    ],
  },
  {
    heading: "Projects",
    cards: [
      { href: "/projects", title: "Project Tracking", description: "Track post-award project stages, tasks, and progress.", icon: <IconFolders />, module: "projects" },
      { href: "/opportunities", title: "Opportunities", description: "Track bids and incoming work before award.", icon: <IconTarget />, module: "opportunities" },
      { href: "/tenders", title: "Tender Monitoring", description: "Track live tenders from the Nama and OETC iSupplier portals.", icon: <IconClipboard />, module: "tenders" },
    ],
  },
  {
    heading: "Employees",
    cards: [
      { href: "/employees", title: "Employees", description: "View and manage employee records.", icon: <IconUsers />, module: "employees" },
    ],
  },
  {
    heading: "Contacts",
    cards: [
      { href: "/companies", title: "Companies", description: "Search and manage company records.", icon: <IconOfficeBuilding />, module: "companies" },
      { href: "/clients", title: "Clients", description: "Companies we deliver projects for.", icon: <IconUserCheck />, module: "clients" },
      { href: "/contractors", title: "Contractors", description: "View and manage contractor company details.", icon: <IconBuilding />, module: "contractors" },
      { href: "/suppliers", title: "Suppliers", description: "View and manage supplier company details.", icon: <IconTruck />, module: "suppliers" },
      { href: "/contacts", title: "Contacts", description: "Search and browse all contacts.", icon: <IconAddressBook />, module: "contacts" },
    ],
  },
  {
    heading: "AI",
    cards: [
      { href: "/ai", title: "AI Assistant", description: "Ask questions about projects, opportunities, and invoices.", icon: <IconSparkles />, module: "ai" },
    ],
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let accessibleModules: string[] = [];

  if (user) {
    const [{ data: profile }, { data: allPerms }] = await Promise.all([
      supabaseAdmin.from("profiles").select("role").eq("id", user.id).single(),
      supabaseAdmin.from("module_permissions").select("role, module").eq("can_access", true),
    ]);

    if (profile) {
      accessibleModules = (allPerms ?? []).filter((p) => p.role === profile.role).map((p) => p.module);
    }
  }

  const sections = ALL_SECTIONS
    .map((s) => ({ ...s, cards: s.cards.filter((c) => accessibleModules.includes(c.module)) }))
    .filter((s) => s.cards.length > 0);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Operations Portal</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Internal tools for IDS-GCC</p>

        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                {section.heading}
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {section.cards.map((card) => (
                  <a
                    key={card.href}
                    href={card.href}
                    className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                  >
                    <div className="text-gray-400 dark:text-gray-500 shrink-0">
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{card.title}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{card.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
