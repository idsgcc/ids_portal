"use client";

import { use, useEffect, useState } from "react";
import CompanyForm from "@/app/components/CompanyForm";

type ContactRow = { name: string; title: string; email: string; phone: string };
type InitialData = Record<string, string> & { contractor_contacts?: ContactRow[]; principal?: string[] };

export default function EditContractorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [initial, setInitial] = useState<InitialData | null>(null);

  useEffect(() => {
    fetch(`/api/contractors/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const { contractor_contacts, principal, ...rest } = d;
        const flat: Record<string, string> = Object.fromEntries(
          Object.entries(rest).map(([k, v]) => [k, v == null ? "" : String(v)])
        );
        const contacts: ContactRow[] = (contractor_contacts ?? []).map((c: Record<string, string | null>) => ({
          name: c.name ?? "",
          title: c.title ?? "",
          email: c.email ?? "",
          phone: c.phone ?? "",
        }));
        const result: InitialData = flat;
        result.contractor_contacts = contacts;
        result.principal = Array.isArray(principal) ? principal : [];
        setInitial(result);
      });
  }, [id]);

  if (!initial) return <main className="min-h-screen p-8"><p className="text-gray-400 text-sm">Loading…</p></main>;
  return <CompanyForm type="contractor" initial={initial} companyId={id} />;
}
