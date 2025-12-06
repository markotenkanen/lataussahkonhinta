"use client"
import type { PriceColorThresholds, PriceData } from "@/components/electricity-dashboard"
import { useTranslation } from "@/lib/translations"

interface PriceListProps {
  data: PriceData[]
  timezone: string
  unitLabel: string
  colorThresholds: PriceColorThresholds
  currentTime: Date
  activeIndex: number
}

function getPriceColor(price: number, thresholds: PriceColorThresholds): string {
  if (price < thresholds.greenMax) return "text-green-600 dark:text-green-400"
  if (price < thresholds.yellowMax) return "text-yellow-600 dark:text-yellow-400"
  if (price < thresholds.orangeMax) return "text-orange-600 dark:text-orange-400"
  return "text-red-600 dark:text-red-400"
}

function getPriceBgColor(price: number, thresholds: PriceColorThresholds): string {
  if (price < thresholds.greenMax) return "bg-green-50 dark:bg-green-950/30"
  if (price < thresholds.yellowMax) return "bg-yellow-50 dark:bg-yellow-950/30"
  if (price < thresholds.orangeMax) return "bg-orange-50 dark:bg-orange-950/30"
  return "bg-red-50 dark:bg-red-950/30"
}

export function PriceList({
  data,
  timezone,
  unitLabel,
  colorThresholds,
  currentTime,
  activeIndex,
}: PriceListProps) {
  const { t, language } = useTranslation()
  const now = currentTime
  const activeSlotIndex = activeIndex >= 0 && activeIndex < data.length ? activeIndex : -1

  const locale = language === "fi" ? "fi-FI" : language === "sv" ? "sv-SE" : "en-US"

  return (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {data.map((item, index) => {
        const itemDate = new Date(item.timestamp)
        const isCurrentOrPast = itemDate.getTime() <= now.getTime()
        const isCurrent = index === activeSlotIndex

        const timeFormat = itemDate.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: timezone,
        })

        const dateFormat = itemDate.toLocaleDateString(locale, {
          day: "numeric",
          month: "numeric",
          timeZone: timezone,
        })

        return (
          <div
            key={index}
            className={`rounded-lg border p-3 transition-colors ${getPriceBgColor(item.price, colorThresholds)} ${
              isCurrent
                ? "border-blue-500 border-2 ring-2 ring-blue-200 dark:ring-blue-800"
                : isCurrentOrPast
                    ? "opacity-60"
                    : ""
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {dateFormat} {timeFormat}
                  {isCurrent && <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">{t("now")}</span>}
                </p>
                <p className={`text-2xl font-bold tabular-nums ${getPriceColor(item.price, colorThresholds)}`}>
                  {item.price.toFixed(2)}
                  <span className="ml-1 text-sm font-normal">{unitLabel}</span>
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
