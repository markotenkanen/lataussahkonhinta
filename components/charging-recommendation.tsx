"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Battery, Clock, Euro, Zap, TrendingDown } from "lucide-react"
import type { PriceData, Resolution } from "./electricity-dashboard"
import { formatTimeInTimezone, isSameDayInTimezone } from "@/lib/date-utils"
import { useTranslation } from "@/lib/translations"

interface ChargingRecommendationProps {
  data: PriceData[]
  currentTime: Date
  resolution: Resolution
  chargerPower: number
  batterySize: number
  timezone: string
  currencySymbol: string
}

export function ChargingRecommendation({
  data,
  currentTime,
  resolution,
  chargerPower,
  batterySize,
  timezone,
  currencySymbol,
}: ChargingRecommendationProps) {
  const { t, language } = useTranslation()

  console.log("[v0] ChargingRecommendation - Current language:", language)
  console.log("[v0] ChargingRecommendation - Translated 'chargingRecommendation':", t("chargingRecommendation"))

  const { bestWindow, isOptimalTime, avgPrice, savings, chargeCost, windowDay, chargingHours } = useMemo(() => {
    if (data.length === 0) {
      return {
        bestWindow: null,
        isOptimalTime: false,
        avgPrice: 0,
        savings: 0,
        chargeCost: 0,
        windowDay: "",
        chargingHours: 0,
      }
    }

    const windowSize = resolution === "hourly" ? 4 : 16
    let bestWindowData = { startIndex: 0, avgPrice: Number.POSITIVE_INFINITY }

    for (let i = 0; i <= data.length - windowSize; i++) {
      const window = data.slice(i, i + windowSize)
      const windowAvgPrice = window.reduce((sum, item) => sum + item.price, 0) / windowSize
      if (windowAvgPrice < bestWindowData.avgPrice) {
        bestWindowData = { startIndex: i, avgPrice: windowAvgPrice }
      }
    }

    const window = {
      start: data[bestWindowData.startIndex],
      end: data[bestWindowData.startIndex + windowSize - 1],
      avgPrice: bestWindowData.avgPrice,
      hours: 4,
    }

    const currentTimestamp = currentTime.getTime()
    const windowStart = new Date(window.start.timestamp).getTime()
    const intervalMs = resolution === "hourly" ? 3600000 : 900000
    const windowEnd = new Date(window.end.timestamp).getTime() + intervalMs
    const optimal = currentTimestamp >= windowStart && currentTimestamp < windowEnd

    const dayAvgPrice = data.reduce((sum, item) => sum + item.price, 0) / data.length

    const savingsPercent = ((dayAvgPrice - window.avgPrice) / dayAvgPrice) * 100

    const cost = (window.avgPrice * batterySize) / 100

    const hours = batterySize / chargerPower

    const windowStartDate = new Date(window.start.timestamp)
    const isToday = isSameDayInTimezone(windowStartDate, currentTime, timezone)
    const tomorrow = new Date(currentTime)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isTomorrow = isSameDayInTimezone(windowStartDate, tomorrow, timezone)

    const dayLabels = {
      fi: { today: "Tänään", tomorrow: "Huomenna" },
      sv: { today: "Idag", tomorrow: "Imorgon" },
      en: { today: "Today", tomorrow: "Tomorrow" },
    }
    const day = isToday ? dayLabels[language].today : isTomorrow ? dayLabels[language].tomorrow : ""

    return {
      bestWindow: window,
      isOptimalTime: optimal,
      avgPrice: dayAvgPrice,
      savings: savingsPercent,
      chargeCost: cost,
      windowDay: day,
      chargingHours: hours,
    }
  }, [data, currentTime, resolution, chargerPower, batterySize, language, timezone])

  if (!bestWindow) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>{t("loadingFailed")}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("chargingRecommendation")}</h2>
        {isOptimalTime && (
          <span className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Zap className="h-4 w-4" />
            {t("bestTimeNow")}
          </span>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Best Charging Window */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("bestChargingTime")}</p>
              <p className="font-mono text-lg font-semibold">
                {formatTimeInTimezone(new Date(bestWindow.start.timestamp), timezone)} - {" "}
                {formatTimeInTimezone(new Date(bestWindow.end.timestamp), timezone)}
              </p>
              {windowDay && <p className="text-xs text-muted-foreground">{windowDay}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <Euro className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("averageToday")}</p>
              <p className="font-mono text-lg font-semibold">{bestWindow.avgPrice.toFixed(2)} c/kWh</p>
            </div>
          </div>
        </div>

        {/* Savings & Cost */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <TrendingDown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("possibleSavings")}</p>
              <p className="font-mono text-lg font-semibold">
                {savings.toFixed(1)}% {t("vsAverage")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <Battery className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("estimatedCost")} ({batterySize}kWh)
              </p>
              <p className="font-mono text-lg font-semibold">{currencySymbol}{chargeCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charging Tips */}
      <div className="mt-6 rounded-lg bg-muted/50 p-4">
        <h3 className="mb-2 font-semibold">💡 {t("smartChargingTips")}</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            • {chargerPower}kW {t("chargerCharges")} {batterySize}kWh {t("batteryFromEmptyToFull")} {" "}
            {chargingHours.toFixed(1)} {t("hours")}
          </li>
          <li>• {t("scheduleChargingTip")}</li>
        </ul>
      </div>
    </Card>
  )
}
