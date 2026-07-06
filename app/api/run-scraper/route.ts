import { NextResponse } from "next/server";

export async function POST() {
  const url = process.env.SCRAPER_URL;
  const token = process.env.SCRAPER_TOKEN;

  if (!url || !token) {
    return NextResponse.json({ error: "Scraper not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${url}/run-scraper`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(90_000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
