"use client";

import { ReactNode } from "react";

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

const sections: { heading: string; cards: { href: string; title: string; description: string; icon: ReactNode }[] }[] = [
  {
    heading: "Projects",
    cards: [
      {
        href: "/projects",
        title: "Project Tracking",
        description: "Track post-award project stages, tasks, and progress.",
        icon: <IconFolders />,
      },
      {
        href: "/tenders",
        title: "Tender Monitoring",
        description: "Track live tenders from the Nama iSupplier portal.",
        icon: <IconClipboard />,
      },
    ],
  },
  {
    heading: "Employees",
    cards: [
      {
        href: "/employees",
        title: "Employees",
        description: "View and manage employee records.",
        icon: <IconUsers />,
      },
    ],
  },
  {
    heading: "Contacts",
    cards: [
      {
        href: "/contractors",
        title: "Contractors",
        description: "View and manage contractor company details.",
        icon: <IconBuilding />,
      },
      {
        href: "/suppliers",
        title: "Suppliers",
        description: "View and manage supplier company details.",
        icon: <IconTruck />,
      },
    ],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Operations Portal</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-10">Internal tools for IDS-GCC</p>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                {section.heading}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {section.cards.map((card) => (
                  <a
                    key={card.href}
                    href={card.href}
                    className="flex items-start gap-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                  >
                    <div className="mt-0.5 text-gray-400 dark:text-gray-500 shrink-0">
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{card.title}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{card.description}</p>
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
