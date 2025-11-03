"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { ArrowDown, ArrowUp, Activity } from "lucide-react"
import type { PriceData, Resolution } from "./electricity-dashboard"
import { useTranslation } from "@/lib/translations"

interface PriceStatsProps {
  todayData: PriceData[]
  tomorrowData: PriceData[]
  resolution: Resolution
  currentTime: Date
}

export function PriceStats({ todayData, tomorrowData, resolution, currentTime }: PriceStatsProps) {
  const { t, language } = useTranslation()

  console.log("[v0] PriceStats - Current language:", language)
  console.log("[v0] PriceStats - Translated 'lowestToday':", t("lowestToday"))

  const locale = language === "fi" ? "fi-FI" : language === "sv" ? "sv-SE" : "en-US"

  const todayStats = useMemo(() => {
    if (todayData.length === 0) return { minPrice: 0, maxPrice: 0, avgPrice: 0, minTime: "", maxTime: "" }

    const prices = todayData.map((d) => d.price)
    const sum = prices.reduce((a, b) => a + b, 0)

    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const minItem = todayData.find((d) => d.price === minPrice)
    const maxItem = todayData.find((d) => d.price === maxPrice)

    const formatTime = (timestamp: string) => {
      const date = new Date(timestamp)
      return date.toLocaleTimeString(locale, {
        timeZone: "Europe/Helsinki",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    }

    return {
      minPrice,
      maxPrice,
      avgPrice: sum / prices.length,
      minTime: minItem ? formatTime(minItem.timestamp) : "",
      maxTime: maxItem ? formatTime(maxItem.timestamp) : "",
    }
  }, [todayData, locale])

  const tomorrowStats = useMemo(() => {
    if (tomorrowData.length === 0) return { minPrice: 0, maxPrice: 0, avgPrice: 0, minTime: "", maxTime: "" }

    const prices = tomorrowData.map((d) => d.price)
    const sum = prices.reduce((a, b) => a + b, 0)

    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const minItem = tomorrowData.find((d) => d.price === minPrice)
    const maxItem = tomorrowData.find((d) => d.price === maxPrice)

    const formatTime = (timestamp: string) => {
      const date = new Date(timestamp)
      return date.toLocaleTimeString(locale, {
        timeZone: "Europe/Helsinki",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    }

    return {
      minPrice,
      maxPrice,
      avgPrice: sum / prices.length,
      minTime: minItem ? formatTime(minItem.timestamp) : "",
      maxTime: maxItem ? formatTime(maxItem.timestamp) : "",
    }
  }, [tomorrowData, locale])

  const stats = [
    {
      label: t("lowestToday"),
      value: todayStats.minPrice,
      time: todayStats.minTime,
      day: t("today"),
      icon: ArrowDown,
      color: "text-primary",
    },
    {
      label: t("highestToday"),
      value: todayStats.maxPrice,
      time: todayStats.maxTime,
      day: t("today"),
      icon: ArrowUp,
      color: "text-destructive",
    },
    {
      label: t("averageToday"),
      value: todayStats.avgPrice,
      time: "",
      day: "",
      icon: Activity,
      color: "text-accent",
    },
    {
      label: t("lowestTomorrow"),
      value: tomorrowStats.minPrice,
      time: tomorrowStats.minTime,
      day: t("tomorrow"),
      icon: ArrowDown,
      color: "text-primary",
    },
    {
      label: t("highestTomorrow"),
      value: tomorrowStats.maxPrice,
      time: tomorrowStats.maxTime,
      day: t("tomorrow"),
      icon: ArrowUp,
      color: "text-destructive",
    },
    {
      label: t("averageTomorrow"),
      value: tomorrowStats.avgPrice,
      time: "",
      day: "",
      icon: Activity,
      color: "text-accent",
    },
  ]

  return (
    <>
      {stats.map((stat) => (
        <Card key={stat.label} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 font-mono text-2xl font-bold">{stat.value.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">{language === "fi" ? "c/kWh" : t("unit")}</p>
              {stat.time && (
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {t("at")} {stat.time} {stat.day}
                </p>
              )}
            </div>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </div>
        </Card>
      ))}
    </>
  )
}
