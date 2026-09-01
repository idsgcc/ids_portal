import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// AED is officially pegged to USD at this exact rate (Central Bank of UAE, never changes).
const AED_PER_USD = 3.6725;
// OMR is pegged to USD; ECB doesn't publish OMR so we derive it.
const OMR_PER_USD = 0.384497; // 1 USD = 0.384497 OMR  →  1 OMR = 2.60095 USD

async function doRefresh() {
  // One ECB call: EUR base → get USD + GBP cross-rates.
  // AED isn't in the ECB dataset; we use its official USD peg instead.
  const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD,GBP", {
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Frankfurter API error: ${res.status}` },
      { status: 502 }
    );
  }

  const json = await res.json();
  const { USD: eurToUsd, GBP: eurToGbp } = json.rates as Record<string, number>;

  // 1 EUR = eurToUsd USD = eurToUsd * 3.6725 AED
  const eurToAed = eurToUsd * AED_PER_USD;
  // 1 GBP = (eurToUsd / eurToGbp) USD = ... * 3.6725 AED
  const gbpToAed = (eurToUsd / eurToGbp) * AED_PER_USD;
  const usdToAed = AED_PER_USD;
  const omrToAed = (1 / OMR_PER_USD) * AED_PER_USD;

  const now = new Date().toISOString();
  const rates = [
    { currency: "EUR", rate_to_aed: eurToAed, source: "frankfurter", updated_at: now },
    { currency: "USD", rate_to_aed: usdToAed, source: "frankfurter", updated_at: now },
    { currency: "GBP", rate_to_aed: gbpToAed, source: "frankfurter", updated_at: now },
    { currency: "OMR", rate_to_aed: omrToAed, source: "frankfurter", updated_at: now },
  ];

  const { error } = await supabaseAdmin
    .from("currency_rates")
    .upsert(rates, { onConflict: "currency" });

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ success: true, date: json.date, rates });
}

// GET — called by Vercel Cron (sends Authorization: Bearer <CRON_SECRET>)
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return doRefresh();
}

// POST — called by the Admin → Finance "Refresh Rates" button
export async function POST() {
  return doRefresh();
}
