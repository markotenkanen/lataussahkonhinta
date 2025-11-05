"use client"

import { useEffect, useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PriceChart } from "@/components/price-chart"
import { ChargingRecommendation } from "@/components/charging-recommendation"
import { CurrentPrice } from "@/components/current-price"
import { PriceStats } from "@/components/price-stats"
import { PriceList } from "@/components/price-list"
import { LanguageSelector } from "@/components/language-selector"
import { Zap, Activity, ChevronDown, ChevronUp, RefreshCw } from "lucide-react"
import useSWR from "swr"
import { isSameDayInTimezone } from "@/lib/date-utils"
import { useTranslation } from "@/lib/translations"
import { APP_VERSION } from "@/lib/version"
import { AREAS, DEFAULT_AREA, AREA_OPTIONS, type AreaCode } from "@/lib/areas"

export interface PriceData {
  timestamp: string
  price: number // cents/kWh (including VAT)
}

export interface PriceColorThresholds {
  greenMax: number
  yellowMax: number
  orangeMax: number
}

export type Resolution = "hourly" | "15min"

const CACHE_PREFIX = "nordpool_price_data"
const CACHE_VERSION = 4
const VAT_MULTIPLIER = 1.24

function cacheKeyFor(area: string) {
  return `${CACHE_PREFIX}:${area}`
}

function getCachedData(area: string): { data: PriceData[]; date: string; fetchedAt: string; version: number } | null {
  if (typeof window === "undefined") return null

  try {
    const cached = localStorage.getItem(cacheKeyFor(area))
    if (!cached) return null

    const parsed = JSON.parse(cached)

    if (!parsed.version || parsed.version < CACHE_VERSION) {
      console.log("[v0] Old cache format detected, clearing cache")
      localStorage.removeItem(cacheKeyFor(area))
      return null
    }

    return parsed
  } catch (error) {
    console.error("Failed to parse cached data:", error)
    return null
  }
}

function setCachedData(area: string, data: PriceData[]) {
  if (typeof window === "undefined") return

  try {
    const finnishDate = new Date().toLocaleDateString("fi-FI", {
      timeZone: "Europe/Helsinki",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    const cacheData = {
      data,
      date: finnishDate,
      fetchedAt: new Date().toISOString(),
      version: CACHE_VERSION,
    }

    console.log("[v0] Caching data with fetchedAt:", cacheData.fetchedAt, "area:", area)
    localStorage.setItem(cacheKeyFor(area), JSON.stringify(cacheData))
  } catch (error) {
    console.error("Failed to cache data:", error)
  }
}

function isCacheValid(cachedDate: string, fetchedAt?: string): boolean {
  const now = new Date()
  const currentFinnishDate = now.toLocaleDateString("fi-FI", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  const finnishTime = now.toLocaleTimeString("fi-FI", {
    timeZone: "Europe/Helsinki",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  console.log("[v0] Cache validation - Current Finnish time string:", finnishTime)
  console.log("[v0] Cache validation - Current Finnish date:", currentFinnishDate)
  console.log("[v0] Cache validation - Cached date:", cachedDate)
  console.log("[v0] Cache validation - Fetched at:", fetchedAt)

  if (!fetchedAt) {
    console.log("[v0] Cache invalid: missing fetchedAt timestamp")
    return false
  }

  if (cachedDate !== currentFinnishDate) {
    console.log("[v0] Cache invalid: date mismatch", cachedDate, "vs", currentFinnishDate)
    return false
  }

  // Finnish locale uses "." as separator (e.g., "18.07"), not ":"
  const timeParts = finnishTime.split(/[:.]/)
  const hours = Number(timeParts[0])
  const minutes = Number(timeParts[1])
  const currentMinutes = hours * 60 + minutes
  const pricePublishTime = 14 * 60 + 20 // 14:20 in minutes

  console.log("[v0] Cache validation - Parsed hours:", hours, "minutes:", minutes)
  console.log("[v0] Cache validation - Current minutes:", currentMinutes, "vs publish time:", pricePublishTime)

  if (currentMinutes >= pricePublishTime) {
    console.log("[v0] Cache validation - Current time is AFTER 14:20")
    const fetchedDate = new Date(fetchedAt)
    const fetchedFinnishDate = fetchedDate.toLocaleDateString("fi-FI", {
      timeZone: "Europe/Helsinki",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    if (fetchedFinnishDate !== currentFinnishDate) {
      console.log("[v0] Cache invalid: fetched on different day")
      return false
    }

    const fetchedFinnishTime = fetchedDate.toLocaleTimeString("fi-FI", {
      timeZone: "Europe/Helsinki",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const fetchedTimeParts = fetchedFinnishTime.split(/[:.]/)
    const fetchedHours = Number(fetchedTimeParts[0])
    const fetchedMinutes = Number(fetchedTimeParts[1])
    const fetchedMinutesTotal = fetchedHours * 60 + fetchedMinutes

    console.log("[v0] Cache validation - Fetched at minutes:", fetchedMinutesTotal)

    if (fetchedMinutesTotal >= pricePublishTime) {
      console.log("[v0] Cache valid: fetched after 14:20 today")
      return true
    }

    console.log("[v0] Cache invalid: after 14:20 but data fetched before 14:20")
    return false
  }

  console.log("[v0] Cache validation - Current time is BEFORE 14:20")
  console.log("[v0] Cache valid: before 14:20 and from today")
  return true
}

const fetcher = async (url: string) => {
  // Derive area from the URL passed by useSWR
  let area = DEFAULT_AREA
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost")
    area = (u.searchParams.get("area") || DEFAULT_AREA) as AreaCode
  } catch {}

  const cached = getCachedData(area)
  if (cached && isCacheValid(cached.date, cached.fetchedAt)) {
    console.log("[v0] Using cached data from:", cached.date, "fetched at:", cached.fetchedAt, "area:", area)
    return cached.data
  }

  console.log("[v0] Fetching fresh data from API")

  // Build URL with cache buster safely (handles existing query params)
  const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost")
  u.searchParams.set("t", String(Date.now()))
  const res = await fetch(u.toString(), {
    cache: "no-store",
  })

  if (!res.ok) {
    const error = new Error("Failed to fetch electricity prices")
    try {
      const errorData = await res.json()
      error.message = errorData.error || error.message
    } catch {}
    throw error
  }

  const data = await res.json()

  if (!Array.isArray(data)) {
    throw new Error("Invalid data format: expected array")
  }

  const validData = data
    .filter((item: any) => {
      return item && typeof item.timestamp === "string" && typeof item.price === "number"
    })
    .map((item: any) => ({
      timestamp: item.timestamp,
      price: Number((item.price * VAT_MULTIPLIER).toFixed(4)),
    }))

  setCachedData(area, validData)

  return validData
}

function aggregateToHourly(data: PriceData[]): PriceData[] {
  const hourlyMap = new Map<string, { sum: number; count: number }>()

  data.forEach((item) => {
    if (!item.timestamp || typeof item.timestamp !== "string") {
      return
    }

    const date = new Date(item.timestamp)

    if (isNaN(date.getTime())) {
      return
    }

    date.setMinutes(0, 0, 0)
    const hourKey = date.toISOString()

    const existing = hourlyMap.get(hourKey) || { sum: 0, count: 0 }
    hourlyMap.set(hourKey, {
      sum: existing.sum + item.price,
      count: existing.count + 1,
    })
  })

  return Array.from(hourlyMap.entries())
    .map(([timestamp, { sum, count }]) => ({
      timestamp,
      price: sum / count,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

function isFifteenMinCadence(data: PriceData[]): boolean {
  if (!data || data.length < 2) return false
  const d0 = new Date(data[0].timestamp).getTime()
  const d1 = new Date(data[1].timestamp).getTime()
  const diff = Math.abs(d1 - d0)
  return diff <= 15 * 60 * 1000 + 1000 // allow 1s slack
}

function expandTo15Min(data: PriceData[]): PriceData[] {
  const out: PriceData[] = []
  for (const item of data) {
    const base = new Date(item.timestamp)
    const m0 = new Date(base)
    m0.setMinutes(0, 0, 0)
    const start = new Date(base)
    start.setMinutes(0, 0, 0)
    // Ensure we create 4 quarters within the same hour of the base timestamp
    for (const add of [0, 15, 30, 45]) {
      const t = new Date(start)
      t.setMinutes(t.getMinutes() + add)
      out.push({ timestamp: t.toISOString(), price: item.price })
    }
  }
  return out.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export function ElectricityDashboard() {
  const { language, setLanguage, t } = useTranslation()

  const [currentTime, setCurrentTime] = useState(new Date())
  const [resolution, setResolution] = useState<Resolution>("hourly")
  const [showPriceList, setShowPriceList] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)

  const [area, setArea] = useState<AreaCode>(() => {
    if (typeof window === "undefined") return DEFAULT_AREA
    try {
      const saved = localStorage.getItem("area") as AreaCode
      if (saved && AREAS[saved]) return saved
    } catch {}
    return DEFAULT_AREA
  })

  const [systemSettings, setSystemSettings] = useState(() => {
    if (typeof window === "undefined") {
      return {
        connectionPower: 17,
        chargerPower: 11,
        batterySize: 75,
      }
    }

    try {
      const saved = localStorage.getItem("system_settings")
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error("Failed to load system settings:", error)
    }

    return {
      connectionPower: 17,
      chargerPower: 11,
      batterySize: 75,
    }
  })

  const [isEditingSettings, setIsEditingSettings] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem("system_settings", JSON.stringify(systemSettings))
    } catch (error) {
      console.error("Failed to save system settings:", error)
    }
  }, [systemSettings])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (language) {
      try {
        localStorage.setItem("language", language)
      } catch (error) {
        console.error("Failed to save language:", error)
      }
    }
  }, [language])

  useEffect(() => {
    try {
      localStorage.setItem("area", area)
    } catch {}
  }, [area])

  const areaInfo = AREAS[area]

  const colorThresholds = useMemo<PriceColorThresholds>(() => {
    switch (areaInfo.currency) {
      case "SEK":
      case "NOK":
        return { greenMax: 50, yellowMax: 100, orangeMax: 200 }
      case "EUR":
      default:
        return { greenMax: 5, yellowMax: 10, orangeMax: 20 }
    }
  }, [areaInfo])

  const { data, error, isLoading, mutate } = useSWR<PriceData[]>(`/api/nordpool?area=${area}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
    revalidateOnReconnect: false,
    refreshInterval: 60 * 60 * 1000,
    dedupingInterval: 30 * 60 * 1000,
  })

  useEffect(() => {
    const checkAndRevalidate = () => {
      const now = new Date()
      const finnishTime = now.toLocaleTimeString("fi-FI", {
        timeZone: "Europe/Helsinki",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      const timeParts = finnishTime.split(/[:.]/)
      const hours = Number(timeParts[0])
      const minutes = Number(timeParts[1])
      const currentMinutes = hours * 60 + minutes
      const pricePublishTime = 14 * 60 + 20 // 14:20

      if (currentMinutes >= pricePublishTime) {
        const cached = getCachedData(area)
        if (cached && !isCacheValid(cached.date, cached.fetchedAt)) {
          console.log("[v0] Time is after 14:20, revalidating to fetch tomorrow's prices")
          mutate()
        }
      }
    }

    checkAndRevalidate()

    const interval = setInterval(checkAndRevalidate, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [mutate, area])

  useEffect(() => {
    if (data && data.length > 0) {
      console.log("[v0] Current time (UTC):", currentTime.toISOString())
      console.log("[v0] Current time (Finnish):", currentTime.toLocaleString("fi-FI", { timeZone: "Europe/Helsinki" }))
      console.log("[v0] First data timestamp:", data[0].timestamp)
      console.log("[v0] Total data items:", data.length)
    }
  }, [data, currentTime])

  const processedData = useMemo(() => {
    if (!data) return []
    if (resolution === "hourly") return aggregateToHourly(data)
    // 15min view: if backend already 15-min cadence, return as-is, else expand hourly -> 15min
    if (isFifteenMinCadence(data)) return data
    return expandTo15Min(aggregateToHourly(data))
  }, [data, resolution])

  const todayPrices = useMemo(() => {
    if (!processedData) return []
    const tz = areaInfo.timezone
    return processedData.filter((item) => isSameDayInTimezone(new Date(item.timestamp), currentTime, tz))
  }, [processedData, currentTime, area])

  const tomorrowPrices = useMemo(() => {
    if (!processedData) return []
    const tomorrow = new Date(currentTime)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tz = areaInfo.timezone
    return processedData.filter((item) => isSameDayInTimezone(new Date(item.timestamp), tomorrow, tz))
  }, [processedData, currentTime, area])

  const futurePrices = useMemo(() => {
    if (!processedData) return []
    const now = currentTime.getTime()
    return processedData.filter((item) => new Date(item.timestamp).getTime() >= now)
  }, [processedData, currentTime])

  const bestChargingWindow = useMemo(() => {
    if (futurePrices.length === 0) return null

    const windowSize = resolution === "hourly" ? 4 : 16
    let bestWindowData = { startIndex: 0, avgPrice: Number.POSITIVE_INFINITY }

    for (let i = 0; i <= futurePrices.length - windowSize; i++) {
      const window = futurePrices.slice(i, i + windowSize)
      const windowAvgPrice = window.reduce((sum, item) => sum + item.price, 0) / windowSize
      if (windowAvgPrice < bestWindowData.avgPrice) {
        bestWindowData = { startIndex: i, avgPrice: windowAvgPrice }
      }
    }

    const startTimestamp = futurePrices[bestWindowData.startIndex].timestamp
    const endTimestamp = futurePrices[bestWindowData.startIndex + windowSize - 1].timestamp

    const startIndex = processedData.findIndex((item) => item.timestamp === startTimestamp)
    const endIndex = processedData.findIndex((item) => item.timestamp === endTimestamp)

    if (startIndex === -1 || endIndex === -1) return null

    return { startIndex, endIndex }
  }, [futurePrices, processedData, resolution])

  const handleRefreshData = async () => {
    setIsRefreshing(true)
    setShowRefreshSuccess(false)

    try {
      // Clear all area caches for this feature
      if (typeof window !== "undefined") {
        const toRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith(CACHE_PREFIX + ":")) {
            toRemove.push(key)
          }
        }
        // Also remove legacy global cache key from older versions
        if (localStorage.getItem(CACHE_PREFIX)) {
          toRemove.push(CACHE_PREFIX)
        }
        toRemove.forEach((k) => localStorage.removeItem(k))
        console.log("[v0] Manual refresh: cleared price data caches:", toRemove)
      }

      const startTime = Date.now()
      await mutate()
      const elapsed = Date.now() - startTime
      const remainingTime = Math.max(0, 1000 - elapsed)

      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime))
      }

      console.log("[v0] Manual refresh: fetched fresh data")

      setLastRefreshTime(new Date())
      setShowRefreshSuccess(true)
      setTimeout(() => setShowRefreshSuccess(false), 3000)
    } catch (error) {
      console.error("[v0] Manual refresh failed:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="p-8 text-center">
          <p className="text-destructive">{t("loadingFailed")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{error.message || t("tryAgain")}</p>
        </Card>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 animate-pulse text-primary" />
          <p className="text-lg text-muted-foreground">{t("loadingPrices")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="md:flex-1">
            <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight md:flex-nowrap md:whitespace-nowrap md:text-4xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight text-balance md:text-4xl">
              <Zap className="h-8 w-8 text-primary md:h-10 md:w-10" />
              {t("title")}
              <span className="text-sm font-medium text-muted-foreground md:text-base">{APP_VERSION}</span>
            </h1>
            <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            {/* Language selector - first on mobile */}
            <LanguageSelector currentLanguage={language} onLanguageChange={setLanguage} />

            {/* Area selector */}
            <div className="rounded-lg border bg-card p-1">
              <select
                value={area}
                onChange={(e) => setArea(e.target.value as AreaCode)}
                className="h-8 rounded-md bg-transparent px-2 text-sm"
              >
                {AREA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Resolution buttons - second on mobile */}
            <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
              <Button
                variant={resolution === "hourly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setResolution("hourly")}
                className="h-8"
              >
                {t("hourly")}
              </Button>
              <Button
                variant={resolution === "15min" ? "default" : "ghost"}
                size="sm"
                onClick={() => setResolution("15min")}
                className="h-8"
              >
                {t("fifteenMin")}
              </Button>
            </div>

            {/* Refresh button and time - third on mobile */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshData}
                  disabled={isRefreshing}
                  className="h-9 bg-transparent"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? t("refreshing") : t("refreshData")}
                </Button>
                {showRefreshSuccess && (
                  <div className="absolute right-0 top-full mt-2 whitespace-nowrap rounded-md bg-green-600 px-3 py-1.5 text-xs text-white shadow-lg">
                    {t("dataRefreshed")}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t("updated")}</p>
                <p className="font-mono text-sm font-medium">
                  {(lastRefreshTime || currentTime).toLocaleTimeString("fi-FI", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <CurrentPrice
            data={processedData}
            currentTime={currentTime}
            resolution={resolution}
            timezone={areaInfo.timezone}
            unitLabel={areaInfo.unitLabel}
          />
          <PriceStats
            todayData={todayPrices}
            tomorrowData={tomorrowPrices}
            resolution={resolution}
            currentTime={currentTime}
            timezone={areaInfo.timezone}
            unitLabel={areaInfo.unitLabel}
          />
        </div>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">
            {t("priceChart")}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({resolution === "hourly" ? t("hourlyInterval") : t("fifteenMinInterval")} {t("intervals")})
            </span>
          </h2>
          <PriceChart
            data={processedData}
            currentTime={currentTime}
            resolution={resolution}
            chargingWindow={bestChargingWindow}
            timezone={areaInfo.timezone}
            unitLabel={areaInfo.unitLabel}
            colorThresholds={colorThresholds}
          />
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {t("priceList")}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({resolution === "hourly" ? t("hourlyInterval") : t("fifteenMinInterval")} {t("intervals")})
              </span>
            </h2>
            <Button variant="outline" size="sm" onClick={() => setShowPriceList(!showPriceList)}>
              {showPriceList ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  {t("hide")}
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  {t("show")}
                </>
              )}
            </Button>
          </div>
          {showPriceList && (
            <PriceList
              data={processedData}
              resolution={resolution}
              timezone={areaInfo.timezone}
              unitLabel={areaInfo.unitLabel}
              colorThresholds={colorThresholds}
            />
          )}
        </Card>

        <ChargingRecommendation
          data={futurePrices}
          currentTime={currentTime}
          resolution={resolution}
          chargerPower={systemSettings.chargerPower}
          batterySize={systemSettings.batterySize}
          timezone={areaInfo.timezone}
          currencySymbol={areaInfo.currencySymbol}
        />

        <Card className="border-muted/50 bg-muted/20 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">{t("systemInfo")}</h3>
            <Button variant="outline" size="sm" onClick={() => setIsEditingSettings(!isEditingSettings)}>
              {isEditingSettings ? t("save") : t("edit")}
            </Button>
          </div>

          {isEditingSettings ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("chargerMax")} (kW)</label>
                <input
                  type="number"
                  value={systemSettings.chargerPower}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      chargerPower: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                  min="1"
                  step="0.1"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("batterySize")} (kWh)</label>
                <input
                  type="number"
                  value={systemSettings.batterySize}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      batterySize: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                  min="1"
                  step="1"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("connection")} (kW)</label>
                <input
                  type="number"
                  value={systemSettings.connectionPower}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      connectionPower: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                  min="1"
                  step="1"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-muted-foreground">{t("chargerMax")}</p>
                <p className="font-mono font-medium">{systemSettings.chargerPower} kW</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("batterySize")}</p>
                <p className="font-mono font-medium">{systemSettings.batterySize} kWh</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("connection")}</p>
                <p className="font-mono font-medium">{systemSettings.connectionPower} kW</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
