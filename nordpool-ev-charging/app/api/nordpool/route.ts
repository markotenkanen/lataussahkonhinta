export const runtime = "edge"
export const dynamic = "force-dynamic"
export const revalidate = 0

import { NextResponse } from "next/server"

interface NordpoolPrice {
  timestamp: string
  price: number
}

interface PorssisahkoPrice {
  price: number
  startDate: string
  endDate: string
}

async function fetchMidnightPrices(todayMidnightUTC: Date): Promise<NordpoolPrice[]> {
  const midnightPrices: NordpoolPrice[] = []

  for (let i = 0; i < 4; i++) {
    const timestamp = new Date(todayMidnightUTC)
    timestamp.setMinutes(i * 15)
    const timestampISO = timestamp.toISOString()

    try {
      const url = `https://api.porssisahko.net/v2/price.json?date=${timestampISO}`
      const response = await fetch(url, {
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()

        if (data && typeof data === "object" && typeof data.price === "number" && !isNaN(data.price)) {
          midnightPrices.push({
            timestamp: timestampISO,
            price: data.price,
          })
        }
      }
    } catch (error) {}
  }

  return midnightPrices
}

export async function GET() {
  try {
    const response = await fetch("https://api.porssisahko.net/v2/latest-prices.json", {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error("Failed to fetch Nordpool prices from API")
    }

    const data = await response.json()

    if (!data || !Array.isArray(data.prices)) {
      throw new Error("Invalid API response structure")
    }

    let prices: NordpoolPrice[] = data.prices
      .filter((item: any) => {
        return (
          item &&
          typeof item === "object" &&
          typeof item.startDate === "string" &&
          item.startDate.length > 0 &&
          typeof item.price === "number" &&
          !isNaN(item.price)
        )
      })
      .map((item: PorssisahkoPrice) => ({
        timestamp: item.startDate,
        price: item.price,
      }))

    const now = new Date()

    const finnishTimeStr = now.toLocaleString("en-US", {
      timeZone: "Europe/Helsinki",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    })

    const [datePart, timePart] = finnishTimeStr.split(", ")
    const [month, day, year] = datePart.split("/")
    const currentHourFinnish = Number.parseInt(timePart.split(":")[0])

    const yearNum = Number.parseInt(year)
    const monthIndex = Number.parseInt(month) - 1
    const dayNum = Number.parseInt(day)

    const todayMidnightUTC = new Date(Date.UTC(yearNum, monthIndex, dayNum - 1, 21, 0, 0, 0))

    const hasMidnightData = prices.some((p) => {
      const priceTime = new Date(p.timestamp)
      return priceTime >= todayMidnightUTC && priceTime < new Date(todayMidnightUTC.getTime() + 60 * 60 * 1000)
    })

    if (!hasMidnightData && currentHourFinnish >= 14) {
      const midnightPrices = await fetchMidnightPrices(todayMidnightUTC)
      if (midnightPrices.length > 0) {
        prices = [...midnightPrices, ...prices]
      }
    }

    prices.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    const finalPrices = prices.filter((p) => {
      return (
        p && typeof p.timestamp === "string" && p.timestamp.length > 0 && typeof p.price === "number" && !isNaN(p.price)
      )
    })

    return NextResponse.json(finalPrices, {
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
