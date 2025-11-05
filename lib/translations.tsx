"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type Language = "fi" | "sv" | "en"

export const translations = {
  fi: {
    title: "Suomi, Ruotsi, Norja pörssisähkön hintaseuranta",
    subtitle: "Reaaliaikainen hintatieto sähköauton järkevään latauksen ajoittamiseen",
    hourly: "1 tunti",
    fifteenMin: "15 min",
    updated: "Päivitetty",
    refreshData: "Päivitä hinnat",
    refreshing: "Päivitetään...",
    dataRefreshed: "Hinnat päivitetty!",
    currentPrice: "Nykyinen hinta",
    lowestToday: "Halvin tänään",
    highestToday: "Kallein tänään",
    averageToday: "Keskihinta tänään",
    lowestTomorrow: "Halvin huomenna",
    highestTomorrow: "Kallein huomenna",
    averageTomorrow: "Keskihinta huomenna",
    now: "Nyt",
    unit: "c/kWh (sis. ALV 24%)",
    today: "Tänään",
    tomorrow: "Huomenna",
    at: "klo",
    priceChart: "Hintakehitys",
    hourlyInterval: "Tunti",
    fifteenMinInterval: "15 minuutin",
    intervals: "välein",
    priceList: "Hintalista",
    show: "Näytä",
    hide: "Piilota",
    chargingRecommendation: "Lataussuositus",
    bestChargingTime: "Paras latausaika",
    chargingDuration: "Latausaika",
    estimatedCost: "Arvioitu hinta",
    systemInfo: "Järjestelmätiedot",
    edit: "Muokkaa",
    save: "Tallenna",
    chargerMax: "Laturin maksimi",
    batterySize: "Akun koko",
    connection: "Sähköliittymä",
    loadingPrices: "Ladataan sähköhintoja...",
    loadingFailed: "Sähköhintojen lataus epäonnistui",
    tryAgain: "Yritä myöhemmin uudelleen",
    bestTimeNow: "Paras aika nyt!",
    averagePrice: "Keskihinta",
    possibleSavings: "Mahdollinen säästö",
    vsAverage: "vs keskihinta",
    estimate: "Arvio",
    smartChargingTips: "Älykkään latauksen vinkit",
    noUpcomingPrices: "Ei tulevia hintatietoja lataussuosituksille",
    chargerCharges: "laturisi lataa",
    batteryFromEmptyToFull: "akun tyhjästä täyteen noin",
    hours: "tunnissa",
    scheduleChargingTip: "Ajoita lataus suositellulle aikavälille (sininen alue kuvaajassa) maksimoidaksesi säästöt",
    updateAvailable: "Uusi versio saatavilla",
    reload: "Lataa uudelleen",
  },
  sv: {
    title: "Elspotpriser för Finland, Sverige och Norge",
    subtitle: "Realtidsprisinformation för smart laddning av elbilar",
    hourly: "1 timme",
    fifteenMin: "15 min",
    updated: "Uppdaterad",
    refreshData: "Uppdatera priser",
    refreshing: "Uppdaterar...",
    dataRefreshed: "Priser uppdaterade!",
    currentPrice: "Nuvarande pris",
    lowestToday: "Lägsta idag",
    highestToday: "Högsta idag",
    averageToday: "Medelpris idag",
    lowestTomorrow: "Lägsta imorgon",
    highestTomorrow: "Högsta imorgon",
    averageTomorrow: "Medelpris imorgon",
    now: "Nu",
    unit: "c/kWh (inkl. moms 24 %)",
    today: "Idag",
    tomorrow: "Imorgon",
    at: "kl",
    priceChart: "Prisutveckling",
    hourlyInterval: "Timme",
    fifteenMinInterval: "15 minuters",
    intervals: "intervall",
    priceList: "Prislista",
    show: "Visa",
    hide: "Dölj",
    chargingRecommendation: "Laddningsrekommendation",
    bestChargingTime: "Bästa laddningstid",
    chargingDuration: "Laddningstid",
    estimatedCost: "Uppskattat pris",
    systemInfo: "Systeminformation",
    edit: "Redigera",
    save: "Spara",
    chargerMax: "Laddare max",
    batterySize: "Batteristorlek",
    connection: "Elanslutning",
    loadingPrices: "Laddar elpriser...",
    loadingFailed: "Kunde inte ladda elpriser",
    tryAgain: "Försök igen senare",
    bestTimeNow: "Bästa tid nu!",
    averagePrice: "Medelpris",
    possibleSavings: "Möjlig besparing",
    vsAverage: "vs medelpris",
    estimate: "Uppskattning",
    smartChargingTips: "Tips för smart laddning",
    noUpcomingPrices: "Inga kommande priser för laddningsrekommendationer",
    chargerCharges: "laddaren laddar",
    batteryFromEmptyToFull: "batteri från tomt till fullt på cirka",
    hours: "timmar",
    scheduleChargingTip:
      "Schemalägg laddningen till den rekommenderade tidsperioden (blått område i diagrammet) för att maximera besparingarna",
    updateAvailable: "Ny version tillgänglig",
    reload: "Ladda om",
  },
  en: {
    title: "Nord Pool electricity prices for Finland, Sweden and Norway",
    subtitle: "Real-time price information for smart EV charging",
    hourly: "1 hour",
    fifteenMin: "15 min",
    updated: "Updated",
    refreshData: "Refresh prices",
    refreshing: "Refreshing...",
    dataRefreshed: "Prices refreshed!",
    currentPrice: "Current price",
    lowestToday: "Lowest today",
    highestToday: "Highest today",
    averageToday: "Average today",
    lowestTomorrow: "Lowest tomorrow",
    highestTomorrow: "Highest tomorrow",
    averageTomorrow: "Average tomorrow",
    now: "Now",
    unit: "c/kWh (incl. VAT 24%)",
    today: "Today",
    tomorrow: "Tomorrow",
    at: "at",
    priceChart: "Price development",
    hourlyInterval: "Hour",
    fifteenMinInterval: "15 minute",
    intervals: "intervals",
    priceList: "Price list",
    show: "Show",
    hide: "Hide",
    chargingRecommendation: "Charging recommendation",
    bestChargingTime: "Best charging time",
    chargingDuration: "Charging duration",
    estimatedCost: "Estimated cost",
    systemInfo: "System information",
    edit: "Edit",
    save: "Save",
    chargerMax: "Charger max",
    batterySize: "Battery size",
    connection: "Power connection",
    loadingPrices: "Loading electricity prices...",
    loadingFailed: "Failed to load electricity prices",
    tryAgain: "Please try again later",
    bestTimeNow: "Best time now!",
    averagePrice: "Average price",
    possibleSavings: "Possible savings",
    vsAverage: "vs average",
    estimate: "Estimate",
    smartChargingTips: "Smart charging tips",
    noUpcomingPrices: "No upcoming prices for charging recommendations",
    chargerCharges: "charger charges",
    batteryFromEmptyToFull: "battery from empty to full in about",
    hours: "hours",
    scheduleChargingTip: "Schedule charging for the recommended time window (blue area in chart) to maximize savings",
    updateAvailable: "New version available",
    reload: "Reload",
  },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: keyof typeof translations.fi) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fi")

  useEffect(() => {
    const stored = localStorage.getItem("language") as Language
    console.log("[v0] LanguageProvider - Initial load, stored language:", stored)
    if (stored && (stored === "fi" || stored === "sv" || stored === "en")) {
      setLanguageState(stored)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    console.log("[v0] LanguageProvider - Setting language to:", lang)
    setLanguageState(lang)
    localStorage.setItem("language", lang)
  }

  const t = (key: keyof typeof translations.fi) => {
    return translations[language][key] || translations.fi[key]
  }

  console.log("[v0] LanguageProvider - Current language:", language)

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider")
  }
  return context
}

export function getTranslation(lang: Language, key: keyof typeof translations.fi): string {
  return translations[lang][key] || translations.fi[key]
}
