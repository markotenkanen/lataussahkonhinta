"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import type { PriceData } from "./electricity-dashboard"
import { useTranslation } from "@/lib/translations"

interface CurrentPriceProps {
  data: PriceData[]
  unitLabel: string
  activeIndex: number
}

export function CurrentPrice({ data, unitLabel, activeIndex }: CurrentPriceProps) {
  const { t, language } = useTranslation()

  console.log("[v0] CurrentPrice - Current language:", language)
  console.log("[v0] CurrentPrice - Translated 'currentPrice':", t("currentPrice"))

  const { currentPrice, previousPrice } = useMemo(() => {
    if (!data || data.length === 0) {
      return { currentPrice: undefined, previousPrice: undefined }
    }

    const index = activeIndex >= 0 && activeIndex < data.length ? activeIndex : 0
    const current = data[index]

    if (!current) {
      return { currentPrice: undefined, previousPrice: undefined }
    }

    if (index > 0) {
      return { currentPrice: current, previousPrice: data[index - 1] }
    }

    const currentTimestamp = new Date(current.timestamp).getTime()
    let fallbackPrevious: PriceData | undefined
    for (let i = data.length - 1; i >= 0; i--) {
      const candidate = data[i]
      const candidateTime = new Date(candidate.timestamp).getTime()
      if (candidateTime < currentTimestamp) {
        fallbackPrevious = candidate
        break
      }
    }

    return { currentPrice: current, previousPrice: fallbackPrevious }
  }, [data, activeIndex])

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
          <p className="text-sm text-muted-foreground">{unitLabel}</p>
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
