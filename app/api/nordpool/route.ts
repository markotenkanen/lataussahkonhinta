export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

import { NextResponse } from "next/server"
import { AREAS, DEFAULT_AREA, type AreaInfo } from "@/lib/areas"

// All sources return VAT-free prices in the area's minor currency unit per kWh
// (c/kWh, öre/kWh, øre/kWh). The client adds VAT itself.
interface NordpoolPrice {
  timestamp: string // UTC ISO start of the delivery period
  price: number
}

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
}

async function fetchJsonOrNull(url: string, retries = 1): Promise<unknown | null> {
  let lastError: unknown = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })

      // 204 / 404 = prices for that day are not published yet
      if (response.status === 204 || response.status === 404) {
        return null
      }

      if (response.ok) {
        const text = await response.text()
        return text ? JSON.parse(text) : null
      }

      lastError = new Error(`Request failed with status ${response.status}`)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed")
}

// Yesterday, today and tomorrow as YYYY-MM-DD in the given time zone
function surroundingDates(timeZone: string): string[] {
  const now = Date.now()
  return [-1, 0, 1].map((offset) =>
    new Date(now + offset * 24 * 60 * 60 * 1000).toLocaleDateString("sv-SE", { timeZone }),
  )
}

function normalize(items: NordpoolPrice[]): NordpoolPrice[] {
  const byTimestamp = new Map<number, NordpoolPrice>()

  for (const item of items) {
    const time = new Date(item.timestamp).getTime()
    if (Number.isFinite(time) && Number.isFinite(item.price)) {
      byTimestamp.set(time, { timestamp: new Date(time).toISOString(), price: item.price })
    }
  }

  return Array.from(byTimestamp.entries())
    .sort(([a], [b]) => a - b)
    .map(([, item]) => item)
}

async function fetchDays(dates: string[], fetchDay: (date: string) => Promise<NordpoolPrice[]>) {
  // One failing day (e.g. tomorrow) must not hide the days that did load
  const days = await Promise.allSettled(dates.map(fetchDay))
  const prices = normalize(days.flatMap((day) => (day.status === "fulfilled" ? day.value : [])))

  if (prices.length === 0) {
    throw new Error("No prices returned")
  }

  return prices
}

// Primary source: Nord Pool data portal, 15-minute day-ahead prices in local currency (per MWh)
async function fetchNordpoolPrices(areaInfo: AreaInfo): Promise<NordpoolPrice[]> {
  return fetchDays(surroundingDates("Europe/Berlin"), async (date) => {
    const url =
      "https://dataportal-api.nordpoolgroup.com/api/DayAheadPrices" +
      `?date=${date}&market=DayAhead&deliveryArea=${encodeURIComponent(areaInfo.code)}` +
      `&currency=${areaInfo.currency}`
    const payload = (await fetchJsonOrNull(url)) as {
      multiAreaEntries?: { deliveryStart?: string; entryPerArea?: Record<string, number> }[]
    } | null

    return (payload?.multiAreaEntries ?? []).map((entry) => ({
      timestamp: entry.deliveryStart ?? "",
      // per MWh -> minor unit per kWh: * 100 / 1000
      price: (entry.entryPerArea?.[areaInfo.code] ?? Number.NaN) / 10,
    }))
  })
}

// FI fallback: porssisahko.net v2, 15-minute prices in c/kWh *including* VAT
async function fetchFiFallbackPrices(areaInfo: AreaInfo): Promise<NordpoolPrice[]> {
  const payload = (await fetchJsonOrNull("https://api.porssisahko.net/v2/latest-prices.json")) as {
    prices?: { price?: number; startDate?: string }[]
  } | null
  const vatDivisor = 1 + areaInfo.vatPercent / 100

  const prices = normalize(
    (payload?.prices ?? []).map((item) => ({
      timestamp: item.startDate ?? "",
      price: typeof item.price === "number" ? item.price / vatDivisor : Number.NaN,
    })),
  )

  if (prices.length === 0) {
    throw new Error("No prices returned")
  }

  return prices
}

// SE fallback: elprisetjustnu.se, 15-minute prices in SEK/kWh excluding VAT
async function fetchSeFallbackPrices(areaInfo: AreaInfo): Promise<NordpoolPrice[]> {
  return fetchDays(surroundingDates(areaInfo.timezone), async (date) => {
    const [year, monthDay] = [date.slice(0, 4), date.slice(5)]
    const url = `https://www.elprisetjustnu.se/api/v1/prices/${year}/${monthDay}_${areaInfo.code}.json`
    const payload = (await fetchJsonOrNull(url)) as { SEK_per_kWh?: number; time_start?: string }[] | null

    return (Array.isArray(payload) ? payload : []).map((item) => ({
      timestamp: item.time_start ?? "",
      price: typeof item.SEK_per_kWh === "number" ? item.SEK_per_kWh * 100 : Number.NaN,
    }))
  })
}

// NO fallback: hvakosterstrommen.no, hourly prices in NOK/kWh excluding VAT
async function fetchNoFallbackPrices(areaInfo: AreaInfo): Promise<NordpoolPrice[]> {
  return fetchDays(surroundingDates(areaInfo.timezone), async (date) => {
    const [year, monthDay] = [date.slice(0, 4), date.slice(5)]
    const url = `https://www.hvakosterstrommen.no/api/v1/prices/${year}/${monthDay}_${areaInfo.code}.json`
    const payload = (await fetchJsonOrNull(url)) as { NOK_per_kWh?: number; time_start?: string }[] | null

    return (Array.isArray(payload) ? payload : []).map((item) => ({
      timestamp: item.time_start ?? "",
      price: typeof item.NOK_per_kWh === "number" ? item.NOK_per_kWh * 100 : Number.NaN,
    }))
  })
}

const FALLBACKS: Record<AreaInfo["country"], (areaInfo: AreaInfo) => Promise<NordpoolPrice[]>> = {
  FI: fetchFiFallbackPrices,
  SE: fetchSeFallbackPrices,
  NO: fetchNoFallbackPrices,
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const areaParam = (searchParams.get("area") || DEFAULT_AREA).toUpperCase()
  const areaInfo = AREAS[areaParam as keyof typeof AREAS] || AREAS[DEFAULT_AREA]

  const sources = [fetchNordpoolPrices, FALLBACKS[areaInfo.country]]

  for (const source of sources) {
    try {
      const prices = await source(areaInfo)
      return NextResponse.json(prices, { headers: NO_STORE_HEADERS })
    } catch (error) {
      console.warn("Price source failed, trying next source", { source: source.name, area: areaInfo.code, error })
    }
  }

  console.error("All price sources failed for area", areaInfo.code)
  return NextResponse.json(
    { error: "Failed to fetch electricity prices" },
    {
      status: 500,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    },
  )
}
