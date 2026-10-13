"use client";

import { useState, useEffect } from "react";

export type CompanyOption = { id: string; name: string };

export function CompanyPicker({
  companyId,
  companyName,
  companies,
  onChange,
}: {
  companyId: string;
  companyName: string;
  companies: CompanyOption[];
  onChange: (id: string, name: string) => void;
}) {
  const [query, setQuery] = useState(companyId ? companyName : "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(companyId ? companyName : "");
  }, [companyId, companyName]);

  const filtered = query.trim().length > 0
    ? companies.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : companies.slice(0, 8);

  function handleBlur() {
    setTimeout(() => {
      setOpen(false);
      setQuery(companyId ? companyName : "");
    }, 150);
  }

  function clear(e: React.MouseEvent) {
    e.preventDefault();
    onChange("", "");
    setQuery("");
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder="Search companies…"
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 pr-8"
        />
        {companyId ? (
          <button
            type="button"
            onMouseDown={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-base leading-none"
          >
            ×
          </button>
        ) : (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>
        )}
      </div>
      {open && (
        <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {companies.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">Loading…</p>
          ) : filtered.length > 0 ? (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => { onChange(c.id, c.name); setQuery(c.name); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {c.name}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-gray-400">No matches</p>
          )}
        </div>
      )}
    </div>
  );
}
