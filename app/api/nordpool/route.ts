export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

import { NextResponse } from "next/server"
import { AREAS, DEFAULT_AREA } from "@/lib/areas"

interface NordpoolPrice {
  timestamp: string
  price: number
}

interface RawPriceItem {
  datetime?: string
  start_time?: string
  price?: number
}

interface FiFallbackPriceItem {
  price?: number
  value?: number
  startDate?: string
  start_date?: string
  datetime?: string
  time?: string
}

async function fetchWithRetry(url: string, retries = 1): Promise<Response> {
  let lastError: unknown = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })

      if (response.ok) {
        return response
      }

      lastError = new Error(`Request failed with status ${response.status}`)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed")
}

async function fetchPrices(areaCode: string): Promise<RawPriceItem[]> {
  const endpoints = [
    `https://mainnet.srcful.dev/price/electricity/${encodeURIComponent(areaCode)}`,
    `https://mainnet.srcful.dev/price/prices/${encodeURIComponent(areaCode)}?format=json`,
  ]

  let lastError: unknown = null

  for (const endpoint of endpoints) {
    try {
      const resp = await fetchWithRetry(endpoint, 1)
      const payload = await resp.json()
      const prices = Array.isArray(payload?.prices) ? payload.prices : []

      if (prices.length > 0) {
        return prices as RawPriceItem[]
      }
    } catch (error) {
      lastError = error
      console.warn("Price endpoint failed, trying fallback endpoint", { endpoint, error })
    }
  }

  throw lastError instanceof Error ? lastError : new Error("No price endpoints available")
}

async function fetchFiFallbackPrices(): Promise<NordpoolPrice[]> {
  const resp = await fetchWithRetry("https://api.porssisahko.net/v1/latest-prices.json", 1)
  const payload = await resp.json()
  const items: FiFallbackPriceItem[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.prices)
      ? payload.prices
      : []

  return items
    .map((item) => {
      const timestamp = item.startDate || item.start_date || item.datetime || item.time
      const price = item.price ?? item.value
      return {
        timestamp: typeof timestamp === "string" ? timestamp : "",
        price: typeof price === "number" ? price : Number.NaN,
      }
    })
    .filter((item) => item.timestamp && Number.isFinite(item.price))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const areaParam = (searchParams.get("area") || DEFAULT_AREA).toUpperCase()
  const areaInfo = AREAS[areaParam as keyof typeof AREAS] || AREAS[DEFAULT_AREA]

  try {
    // 2) Fetch same-day EUR→{SEK,NOK} FX rates in parallel so Nordic prices convert to local currency
    const fxUrl = "https://api.exchangerate.host/latest?base=EUR&symbols=SEK,NOK"

    const [items, fxResp] = await Promise.all([
      fetchPrices(areaInfo.code),
      fetch(fxUrl, { cache: "no-store" }).catch((err) => {
        console.warn("Failed to fetch FX rates, using fallback", err)
        return null
      }),
    ])

    let eurToSek = 11.0
    let eurToNok = 11.0
    if (fxResp && fxResp.ok) {
      try {
        const fx = await fxResp.json()
        eurToSek = fx?.rates?.SEK ?? eurToSek
        eurToNok = fx?.rates?.NOK ?? eurToNok
      } catch (err) {
        console.warn("Failed to parse FX response, using fallback", err)
      }
    }

    const minorPerEur: Record<string, number> = {
      EUR: 100, // cents
      SEK: eurToSek * 100, // öre
      NOK: eurToNok * 100, // øre
    }

    // 3) Convert EUR/MWh -> local minor unit per kWh
    // formula: (EUR_per_MWh * local_minor_per_EUR) / 1000
    const out: NordpoolPrice[] = items
      .filter(
        (it) =>
          (typeof it?.datetime === "string" || typeof it?.start_time === "string") &&
          typeof it?.price === "number",
      )
      .map((it) => {
        const eurPerMwh = it.price as number
        const localMinorPerEur = minorPerEur[areaInfo.currency] ?? minorPerEur.EUR
        const value = (eurPerMwh * localMinorPerEur) / 1000
        return {
          timestamp: (it.datetime || it.start_time) as string, // UTC ISO from provider
          price: value, // minor unit per kWh (c/øre per kWh)
        }
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return NextResponse.json(out, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    })
  } catch (error) {
    if (areaInfo.code === "FI") {
      try {
        const fallbackOut = await fetchFiFallbackPrices()
        if (fallbackOut.length > 0) {
          return NextResponse.json(fallbackOut, {
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
              "CDN-Cache-Control": "no-store",
              "Vercel-CDN-Cache-Control": "no-store",
            },
          })
        }
      } catch (fallbackError) {
        console.error("FI fallback API failed:", fallbackError)
      }
    }

    console.error("Error fetching Nordpool prices:", error)
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
}
