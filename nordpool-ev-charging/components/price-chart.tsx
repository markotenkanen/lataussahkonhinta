"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { PriceData, Resolution } from "./electricity-dashboard"
import { getDateInTimezone } from "@/lib/date-utils"

interface PriceChartProps {
  data: PriceData[]
  currentTime: Date
  resolution: Resolution
  chargingWindow?: { startIndex: number; endIndex: number } | null
}

function getPriceColor(price: number): string {
  if (price < 10) {
    return "hsl(142, 76%, 36%)" // Green for low prices (0-10 c/kWh)
  } else if (price < 20) {
    return "hsl(48, 96%, 53%)" // Yellow for medium prices (10-20 c/kWh)
  } else if (price < 40) {
    return "hsl(25, 95%, 53%)" // Orange for high prices (20-40 c/kWh)
  } else {
    return "hsl(0, 84%, 60%)" // Red for extreme prices (40+ c/kWh)
  }
}

export function PriceChart({ data, currentTime, resolution, chargingWindow }: PriceChartProps) {
  const { chartData, avgPrice, currentTimeIndex } = useMemo(() => {
    const prices = data.map((item) => item.price)
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length

    const formatted = data.map((item, index) => {
      const itemDate = new Date(item.timestamp)
      return {
        index,
        time: itemDate.toLocaleTimeString("fi-FI", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Helsinki",
        }),
        date: itemDate.toLocaleDateString("fi-FI", {
          day: "numeric",
          month: "short",
          timeZone: "Europe/Helsinki",
        }),
        price: item.price,
        timestamp: item.timestamp,
        color: getPriceColor(item.price),
      }
    })

    const finnishCurrentTime = getDateInTimezone(currentTime, "Europe/Helsinki")
    const currentHour = finnishCurrentTime.hour
    const currentMinute = finnishCurrentTime.minute
    const currentDay = finnishCurrentTime.day

    console.log("[v0] Chart - Current time (Finnish):", {
      year: finnishCurrentTime.year,
      month: finnishCurrentTime.month,
      day: currentDay,
      hour: currentHour,
      minute: currentMinute,
    })

    let currentIdx = -1
    if (resolution === "15min") {
      const roundedMinute = Math.floor(currentMinute / 15) * 15
      console.log("[v0] Chart - Looking for 15min slot:", { hour: currentHour, minute: roundedMinute, day: currentDay })

      currentIdx = formatted.findIndex((item) => {
        const itemDate = getDateInTimezone(new Date(item.timestamp), "Europe/Helsinki")
        const matches =
          itemDate.hour === currentHour && itemDate.minute === roundedMinute && itemDate.day === currentDay
        if (itemDate.hour === currentHour && itemDate.minute === roundedMinute) {
          console.log(
            "[v0] Chart - Found matching time at index",
            item.index,
            "day:",
            itemDate.day,
            "matches:",
            matches,
          )
        }
        return matches
      })
    } else {
      console.log("[v0] Chart - Looking for hourly slot:", { hour: currentHour, day: currentDay })

      currentIdx = formatted.findIndex((item) => {
        const itemDate = getDateInTimezone(new Date(item.timestamp), "Europe/Helsinki")
        const matches = itemDate.hour === currentHour && itemDate.day === currentDay
        if (itemDate.hour === currentHour) {
          console.log(
            "[v0] Chart - Found matching hour at index",
            item.index,
            "day:",
            itemDate.day,
            "matches:",
            matches,
          )
        }
        return matches
      })
    }

    console.log("[v0] Chart - Current time index:", currentIdx)

    return { chartData: formatted, avgPrice: avg, currentTimeIndex: currentIdx }
  }, [data, currentTime, resolution])

  const CustomTooltip = useMemo(
    () =>
      ({ active, payload }: any) => {
        if (active && payload && payload.length) {
          const price = payload[0].value
          const color = getPriceColor(price)

          return (
            <div className="rounded-lg border-2 bg-card p-3 shadow-xl" style={{ borderColor: color }}>
              <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
              <p className="text-sm font-medium">{payload[0].payload.time}</p>
              <p className="text-lg font-bold" style={{ color }}>
                {price.toFixed(2)} c/kWh
              </p>
            </div>
          )
        }
        return null
      },
    [],
  )

  const tickInterval = useMemo(() => {
    if (resolution === "15min") {
      return Math.max(1, Math.floor(chartData.length / 24))
    }
    return Math.max(1, Math.floor(chartData.length / 12))
  }, [chartData.length, resolution])

  const ChargingWindowLabel = ({ viewBox }: any) => {
    if (!chargingWindow) return null

    const startX = viewBox.x + (viewBox.width / chartData.length) * chargingWindow.startIndex
    const endX = viewBox.x + (viewBox.width / chartData.length) * (chargingWindow.endIndex + 1)
    const midX = (startX + endX) / 2
    const midY = viewBox.y + viewBox.height / 2

    return (
      <g>
        {/* Vertical text in the middle */}
        <text
          x={midX}
          y={midY}
          textAnchor="middle"
          fill="white"
          fontSize="14"
          fontWeight="700"
          className="select-none"
          transform={`rotate(-90 ${midX} ${midY})`}
        >
          Suositeltu latausaika
        </text>
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData} margin={{ top: 40, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.8} />
            <stop offset="33%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.6} />
            <stop offset="67%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="index"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          interval={tickInterval}
          tickFormatter={(index) => chartData[index]?.time || ""}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          label={{
            value: "c/kWh",
            angle: -90,
            position: "insideLeft",
            style: { fill: "hsl(var(--muted-foreground))" },
          }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 2 }} />
        <ReferenceLine
          y={avgPrice}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{
            value: `Keskim: ${avgPrice.toFixed(2)}`,
            position: "right",
            fill: "hsl(var(--muted-foreground))",
            fontSize: 12,
            fontWeight: 600,
          }}
        />
        {currentTimeIndex >= 0 && <ReferenceLine x={currentTimeIndex} stroke="#3b82f6" strokeWidth={2} />}

        {chargingWindow && (
          <ReferenceArea
            x1={chargingWindow.startIndex}
            x2={chargingWindow.endIndex}
            fill="hsl(217, 91%, 60%)"
            fillOpacity={0.2}
            stroke="none"
            label={<ChargingWindowLabel />}
          />
        )}

        <Area
          type="monotone"
          dataKey="price"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          fill="url(#priceGradient)"
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
