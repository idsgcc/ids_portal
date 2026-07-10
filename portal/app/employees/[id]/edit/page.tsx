"use client";

import { use, useEffect, useState } from "react";
import EmployeeForm from "@/app/components/EmployeeForm";

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [initial, setInitial] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const stringified = Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, v == null ? "" : String(v)])
        );
        setInitial(stringified);
      });
  }, [id]);

  if (!initial) return <main className="min-h-screen p-8"><p className="text-gray-400 text-sm">Loading…</p></main>;

  return <EmployeeForm initial={initial} employeeId={id} />;
}
