"use client";

import { use, useEffect, useState } from "react";
import CompanyForm from "@/app/components/CompanyForm";

type ContactRow = { name: string; title: string; email: string; phone: string };
type InitialData = Record<string, string> & { client_contacts?: ContactRow[] };

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [initial, setInitial] = useState<InitialData | null>(null);

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const { client_contacts, ...rest } = d;
        const flat: Record<string, string> = Object.fromEntries(
          Object.entries(rest).map(([k, v]) => [k, v == null ? "" : String(v)])
        );
        const contacts: ContactRow[] = (client_contacts ?? []).map((c: Record<string, string | null>) => ({
          name: c.name ?? "",
          title: c.title ?? "",
          email: c.email ?? "",
          phone: c.phone ?? "",
        }));
        const result: InitialData = flat;
        result.client_contacts = contacts;
        setInitial(result);
      });
  }, [id]);

  if (!initial) return <main className="min-h-screen p-8"><p className="text-gray-400 text-sm">Loading…</p></main>;
  return <CompanyForm type="client" initial={initial} companyId={id} />;
}
