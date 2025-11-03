"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import type { PriceData, Resolution } from "./electricity-dashboard"
import { getDateInTimezone } from "@/lib/date-utils"
import { useTranslation } from "@/lib/translations"

interface CurrentPriceProps {
  data: PriceData[]
  currentTime: Date
  resolution: Resolution
}

export function CurrentPrice({ data, currentTime, resolution }: CurrentPriceProps) {
  const { t, language } = useTranslation()

  console.log("[v0] CurrentPrice - Current language:", language)
  console.log("[v0] CurrentPrice - Translated 'currentPrice':", t("currentPrice"))

  const { currentPrice, previousPrice } = useMemo(() => {
    const finnishTime = getDateInTimezone(currentTime, "Europe/Helsinki")

    let current: PriceData | undefined
    let previous: PriceData | undefined

    if (resolution === "15min") {
      const currentMinutes = Math.floor(finnishTime.minute / 15) * 15

      current = data.find((item) => {
        const itemTime = getDateInTimezone(new Date(item.timestamp), "Europe/Helsinki")
        return (
          itemTime.year === finnishTime.year &&
          itemTime.month === finnishTime.month &&
          itemTime.day === finnishTime.day &&
          itemTime.hour === finnishTime.hour &&
          itemTime.minute === currentMinutes
        )
      })

      const prevMinutes = currentMinutes - 15 < 0 ? 45 : currentMinutes - 15
      const prevHour = currentMinutes - 15 < 0 ? (finnishTime.hour === 0 ? 23 : finnishTime.hour - 1) : finnishTime.hour

      previous = data.find((item) => {
        const itemTime = getDateInTimezone(new Date(item.timestamp), "Europe/Helsinki")
        return (
          itemTime.year === finnishTime.year &&
          itemTime.month === finnishTime.month &&
          itemTime.day === finnishTime.day &&
          itemTime.hour === prevHour &&
          itemTime.minute === prevMinutes
        )
      })
    } else {
      const currentHour = finnishTime.hour
      const previousHour = currentHour === 0 ? 23 : currentHour - 1

      current = data.find((item) => {
        const itemTime = getDateInTimezone(new Date(item.timestamp), "Europe/Helsinki")
        return (
          itemTime.year === finnishTime.year &&
          itemTime.month === finnishTime.month &&
          itemTime.day === finnishTime.day &&
          itemTime.hour === currentHour
        )
      })

      previous = data.find((item) => {
        const itemTime = getDateInTimezone(new Date(item.timestamp), "Europe/Helsinki")
        const prevDay = currentHour === 0 ? finnishTime.day - 1 : finnishTime.day
        return (
          itemTime.year === finnishTime.year &&
          itemTime.month === finnishTime.month &&
          itemTime.day === prevDay &&
          itemTime.hour === previousHour
        )
      })
    }

    return { currentPrice: current, previousPrice: previous }
  }, [data, currentTime, resolution])

  const price = currentPrice?.price ?? 0
  const prevPrice = previousPrice?.price ?? price
  const change = price - prevPrice
  const changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0

  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus
  const trendColor = change > 0 ? "text-destructive" : change < 0 ? "text-primary" : "text-muted-foreground"

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("currentPrice")}</p>
          <p className="mt-2 font-mono text-3xl font-bold">{price.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">c/kWh</p>
        </div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="h-5 w-5" />
          <span className="font-mono text-sm font-medium">
            {change > 0 ? "+" : ""}
            {changePercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </Card>
  )
}
