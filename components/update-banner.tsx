"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, X } from "lucide-react"
import { APP_VERSION, VERSION_KEY } from "@/lib/version"
import { useTranslation } from "@/lib/translations"

export function UpdateBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    // Check if app version has changed
    const storedVersion = localStorage.getItem(VERSION_KEY)

    if (storedVersion && storedVersion !== APP_VERSION) {
      console.log("[v0] New version detected:", APP_VERSION, "old:", storedVersion)
      setShowBanner(true)
    } else if (!storedVersion) {
      // First time loading, store version
      localStorage.setItem(VERSION_KEY, APP_VERSION)
    }
  }, [])

  const handleReload = () => {
    // Store new version
    localStorage.setItem(VERSION_KEY, APP_VERSION)

    // Force hard reload (bypass all caches)
    window.location.reload()
  }

  const handleDismiss = () => {
    // Update version without reloading
    localStorage.setItem(VERSION_KEY, APP_VERSION)
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <Alert className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md shadow-lg border-blue-500 bg-blue-50">
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">{t("updateAvailable")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleReload} className="bg-blue-600 hover:bg-blue-700">
            {t("reload")}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
