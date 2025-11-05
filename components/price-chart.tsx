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
import type { PriceColorThresholds, PriceData, Resolution } from "./electricity-dashboard"
import { getDateInTimezone } from "@/lib/date-utils"

interface PriceChartProps {
  data: PriceData[]
  currentTime: Date
  resolution: Resolution
  chargingWindow?: { startIndex: number; endIndex: number } | null
  timezone: string
  unitLabel: string
  colorThresholds: PriceColorThresholds
}

const PRICE_COLORS = {
  green: "#16a34a",
  yellow: "#facc15",
  orange: "#f97316",
  red: "#dc2626",
} as const

function resolveColor(price: number, thresholds: PriceColorThresholds): string {
  if (price < thresholds.greenMax) {
    return PRICE_COLORS.green
  }
  if (price < thresholds.yellowMax) {
    return PRICE_COLORS.yellow
  }
  if (price < thresholds.orangeMax) {
function getColorForPrice(price: number): string {
  if (price < 5) {
    return PRICE_COLORS.green
  }
  if (price < 10) {
    return PRICE_COLORS.yellow
  }
  if (price < 20) {
    return PRICE_COLORS.orange
  }
  return PRICE_COLORS.red
}

export function PriceChart({
  data,
  currentTime,
  resolution,
  chargingWindow,
  timezone,
  unitLabel,
  colorThresholds,
}: PriceChartProps) {
  const { greenMax, yellowMax, orangeMax } = colorThresholds

  const getColorForPrice = useMemo(() => {
    return (price: number) => resolveColor(price, colorThresholds)
  }, [colorThresholds])

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
          timeZone: timezone,
        }),
        date: itemDate.toLocaleDateString("fi-FI", {
          day: "numeric",
          month: "short",
          timeZone: timezone,
        }),
        price: item.price,
        timestamp: item.timestamp,
        color: getColorForPrice(item.price),
      }
    })

    const localCurrentTime = getDateInTimezone(currentTime, timezone)
    const currentHour = localCurrentTime.hour
    const currentMinute = localCurrentTime.minute
    const currentDay = localCurrentTime.day

    console.log("[v0] Chart - Current time (local tz):", {
      year: localCurrentTime.year,
      month: localCurrentTime.month,
      day: currentDay,
      hour: currentHour,
      minute: currentMinute,
    })

    let currentIdx = -1
    if (resolution === "15min") {
      const roundedMinute = Math.floor(currentMinute / 15) * 15
      console.log("[v0] Chart - Looking for 15min slot:", { hour: currentHour, minute: roundedMinute, day: currentDay })

      currentIdx = formatted.findIndex((item) => {
        const itemDate = getDateInTimezone(new Date(item.timestamp), timezone)
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
        const itemDate = getDateInTimezone(new Date(item.timestamp), timezone)
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
  }, [data, currentTime, resolution, timezone])

  const CustomTooltip = useMemo(
    () =>
      ({ active, payload }: any) => {
        if (active && payload && payload.length) {
          const price = payload[0].value
          const color = getColorForPrice(price)

          return (
            <div className="rounded-lg border-2 bg-card p-3 shadow-xl" style={{ borderColor: color }}>
              <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
              <p className="text-sm font-medium">{payload[0].payload.time}</p>
              <p className="text-lg font-bold" style={{ color }}>
                {price.toFixed(2)} {unitLabel}
              </p>
            </div>
          )
        }
        return null
      },
    [getColorForPrice, unitLabel],
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

  const gradientStops = useMemo(() => {
    if (chartData.length === 0) {
      return [
        { offset: "0%", color: PRICE_COLORS.red, opacity: 0.7 },
        { offset: "100%", color: PRICE_COLORS.green, opacity: 0.3 },
      ]
    }

    const prices = chartData.map((item) => item.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice)) {
      return [
        { offset: "0%", color: PRICE_COLORS.red, opacity: 0.7 },
        { offset: "100%", color: PRICE_COLORS.green, opacity: 0.3 },
      ]
    }

    if (Math.abs(maxPrice - minPrice) < 1e-6) {
      const color = getColorForPrice(minPrice)
      return [
        { offset: "0%", color, opacity: 0.7 },
        { offset: "100%", color, opacity: 0.3 },
      ]
    }

    const range = maxPrice - minPrice
    const stops: { value: number; color: string }[] = [
      { value: maxPrice, color: getColorForPrice(maxPrice) },
    ]

    const thresholds = [
      { value: orangeMax, color: PRICE_COLORS.orange },
      { value: yellowMax, color: PRICE_COLORS.yellow },
      { value: greenMax, color: PRICE_COLORS.green },
      { value: 20, color: PRICE_COLORS.orange },
      { value: 10, color: PRICE_COLORS.yellow },
      { value: 5, color: PRICE_COLORS.green },
    ]

    thresholds.forEach(({ value, color }) => {
      if (value <= maxPrice && value >= minPrice) {
        stops.push({ value, color })
      }
    })

    stops.push({ value: minPrice, color: getColorForPrice(minPrice) })

    const uniqueStops = Array.from(
      new Map(stops.map((stop) => [stop.value, stop])).values(),
    ).sort((a, b) => b.value - a.value)

    return uniqueStops.map((stop, index) => {
      const normalized = (stop.value - minPrice) / range
      const offset = 1 - normalized
      const opacity =
        0.85 - 0.5 * (index / Math.max(uniqueStops.length - 1, 1))

      return {
        offset: `${(offset * 100).toFixed(2)}%`,
        color: stop.color,
        opacity: Number(opacity.toFixed(2)),
      }
    })
  }, [chartData, getColorForPrice, greenMax, orangeMax, yellowMax])
  }, [chartData])

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData} margin={{ top: 40, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            {gradientStops.map((stop) => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="index"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          interval={tickInterval}
          tickFormatter={(index: number) => chartData[index]?.time || ""}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          label={{
            value: unitLabel,
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
