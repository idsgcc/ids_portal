import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE = "appxqenVNq6LzemF5";
const AIRTABLE_LOG = "tblQshmiiWfllGRji";

export async function GET() {
  if (!AIRTABLE_TOKEN) {
    return NextResponse.json({ error: "Airtable not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    "fields[]": "Run Time",
    "fields[1]": "New Tenders",
    "fields[2]": "Tenders Found",
    "fields[3]": "Status",
    "fields[4]": "Notes",
    "sort[0][field]": "Run Time",
    "sort[0][direction]": "desc",
    "pageSize": "1",
  });

  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_LOG}?${params}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, next: { revalidate: 0 } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Airtable fetch failed" }, { status: 502 });
  }

  const data = await res.json();
  const record = data.records?.[0]?.fields ?? null;
  return NextResponse.json(record);
}
