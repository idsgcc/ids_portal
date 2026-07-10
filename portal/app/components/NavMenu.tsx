"use client";

import { useState, useRef, useEffect } from "react";

const NAV_ITEMS = [
  { group: "Projects", items: [
    { label: "Project Tracking", href: "/projects" },
    { label: "Tender Monitoring", href: "/tenders" },
  ]},
  { group: "Employees", items: [
    { label: "Employees", href: "/employees" },
  ]},
  { group: "Contacts", items: [
    { label: "Contractors", href: "/contractors" },
    { label: "Suppliers", href: "/suppliers" },
  ]},
];

export function NavMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        Menu
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-2 z-50">
          {NAV_ITEMS.map((group, gi) => (
            <div key={group.group}>
              {gi > 0 && <div className="my-1 border-t border-gray-100 dark:border-gray-800" />}
              <p className="px-4 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {group.group}
              </p>
              {group.items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
