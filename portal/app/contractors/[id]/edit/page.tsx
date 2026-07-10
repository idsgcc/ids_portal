"use client";

import { use, useEffect, useState } from "react";
import CompanyForm from "@/app/components/CompanyForm";

export default function EditContractorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [initial, setInitial] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    fetch(`/api/contractors/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setInitial(Object.fromEntries(
          Object.entries(d).map(([k, v]) => [k, v == null ? "" : String(v)])
        ));
      });
  }, [id]);

  if (!initial) return <main className="min-h-screen p-8"><p className="text-gray-400 text-sm">Loading…</p></main>;
  return <CompanyForm type="contractor" initial={initial} companyId={id} />;
}
