"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Contact = {
  id: string;
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number;
};

type Contractor = {
  id: string;
  name: string;
  country: string | null;
  principal: string[] | null;
  specialization: string | null;
  status: string;
  website: string | null;
  trade_license: string | null;
  notes: string | null;
  created_at: string;
  contractor_contacts: Contact[];
};

const LOGO_COLORS = [
  "bg-blue-600", "bg-indigo-600", "bg-violet-600",
  "bg-sky-600", "bg-teal-600", "bg-cyan-600",
];
function logoColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return LOGO_COLORS[Math.abs(h) % LOGO_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  inactive: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
};

function Row({ label, value, href }: { label: string; value: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0 mr-4">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:text-blue-600 truncate">{value}</a>
      ) : (
        <span className="text-sm font-medium text-right">{value}</span>
      )}
    </div>
  );
}

export default function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [c, setC] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch(`/api/contractors/${id}`)
      .then((r) => r.json())
      .then((d) => { setC(d?.error ? null : d); setLoading(false); });
  }, [id]);

  async function toggleStatus() {
    if (!c) return;
    const next = c.status === "active" ? "inactive" : "active";
    await fetch(`/api/contractors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setC({ ...c, status: next });
  }

  async function del() {
    await fetch(`/api/contractors/${id}`, { method: "DELETE" });
    router.push("/contractors");
  }

  if (loading) return <main className="min-h-screen p-8"><p className="text-gray-400 text-sm">Loading…</p></main>;
  if (!c) return <main className="min-h-screen p-8"><p className="text-red-500 text-sm">Contractor not found.</p></main>;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-lg mx-auto">
        <Link href="/contractors" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to contractors
        </Link>

        {/* Header */}
        <div className="mt-6 mb-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl ${logoColor(c.name)} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
              {initials(c.name)}
            </div>
            <div>
              <h1 className="text-xl font-bold">{c.name}</h1>
              {c.specialization && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-0.5">{c.specialization}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${STATUS_STYLES[c.status] ?? STATUS_STYLES.inactive}`}>
                  {c.status}
                </span>
                {c.principal?.map((p) => (
                  <span key={p} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                    {p}
                  </span>
                ))}
                {c.country && <span className="text-xs text-gray-400">{c.country}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-6">
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Company</p>
            {c.principal?.length ? <Row label="Principal" value={c.principal.join(", ")} /> : null}
            <Row label="Trade License" value={c.trade_license} />
            <Row label="Website" value={c.website} href={c.website ?? undefined} />
          </div>

          {c.contractor_contacts.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
              {c.contractor_contacts.map((contact, i) => (
                <div key={contact.id} className={i > 0 ? "pt-4 border-t border-gray-100 dark:border-gray-800" : ""}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                    {i === 0 ? "Primary Contact" : contact.title || `Contact ${i + 1}`}
                  </p>
                  <Row label="Name" value={contact.name} />
                  {contact.title && i > 0 && <Row label="Title" value={contact.title} />}
                  {i === 0 && contact.title && <Row label="Title" value={contact.title} />}
                  <Row label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
                  <Row label="Phone" value={contact.phone} href={contact.phone ? `tel:${contact.phone}` : undefined} />
                </div>
              ))}
            </div>
          )}

          {c.notes && (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Notes</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{c.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href={`/contractors/${id}/edit`}
            className="flex-1 py-2 text-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={toggleStatus}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
              c.status === "active"
                ? "border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                : "border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
            }`}
          >
            {c.status === "active" ? "Mark Inactive" : "Mark Active"}
          </button>
          {confirming ? (
            <div className="flex gap-2 flex-1">
              <button onClick={del} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">Confirm</button>
              <button onClick={() => setConfirming(false)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium transition-colors">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex-1 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
