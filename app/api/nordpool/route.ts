export const runtime = "edge"
export const dynamic = "force-dynamic"
export const revalidate = 0

import { NextResponse } from "next/server"
import { AREAS, DEFAULT_AREA } from "@/lib/areas"

interface NordpoolPrice {
  timestamp: string
  price: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const areaParam = (searchParams.get("area") || DEFAULT_AREA).toUpperCase()
    const areaInfo = AREAS[areaParam as keyof typeof AREAS] || AREAS[DEFAULT_AREA]

    // 1) Fetch hourly EUR/MWh prices for selected area from Sourceful (ENTSO-E aggregated)
    const srcUrl = `https://mainnet.srcful.dev/price/electricity/${encodeURIComponent(areaInfo.code)}`

    // 2) Fetch same-day EUR→{SEK,NOK} FX rates in parallel so Nordic prices convert to local currency
    const fxUrl = "https://api.exchangerate.host/latest?base=EUR&symbols=SEK,NOK"

    const [resp, fxResp] = await Promise.all([
      fetch(srcUrl, { cache: "no-store" }),
      fetch(fxUrl, { cache: "no-store" }).catch((err) => {
        console.warn("Failed to fetch FX rates, using fallback", err)
        return null
      }),
    ])

    if (!resp.ok) {
      throw new Error(`Failed to fetch prices for area ${areaInfo.code}`)
    }

    const payload = await resp.json()
    const items: any[] = Array.isArray(payload?.prices) ? payload.prices : []

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
      .filter((it) => typeof it?.datetime === "string" && typeof it?.price === "number")
      .map((it) => {
        const eurPerMwh = it.price as number
        const localMinorPerEur = minorPerEur[areaInfo.currency] ?? minorPerEur.EUR
        const value = (eurPerMwh * localMinorPerEur) / 1000
        return {
          timestamp: it.datetime, // UTC ISO from provider
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
