export type AreaCode =
  | "FI"
  | "SE1" | "SE2" | "SE3" | "SE4"
  | "NO1" | "NO2" | "NO3" | "NO4" | "NO5"

export interface AreaInfo {
  code: AreaCode
  country: "FI" | "SE" | "NO"
  timezone: string
  currency: "EUR" | "SEK" | "NOK"
  unitLabel: string // minor unit per kWh, e.g. c/kWh, öre/kWh, øre/kWh
  currencySymbol: string
}

export const AREAS: Record<AreaCode, AreaInfo> = {
  FI:   { code: "FI",  country: "FI", timezone: "Europe/Helsinki", currency: "EUR", unitLabel: "c/kWh",  currencySymbol: "€" },
  SE1:  { code: "SE1", country: "SE", timezone: "Europe/Stockholm", currency: "SEK", unitLabel: "öre/kWh", currencySymbol: "kr" },
  SE2:  { code: "SE2", country: "SE", timezone: "Europe/Stockholm", currency: "SEK", unitLabel: "öre/kWh", currencySymbol: "kr" },
  SE3:  { code: "SE3", country: "SE", timezone: "Europe/Stockholm", currency: "SEK", unitLabel: "öre/kWh", currencySymbol: "kr" },
  SE4:  { code: "SE4", country: "SE", timezone: "Europe/Stockholm", currency: "SEK", unitLabel: "öre/kWh", currencySymbol: "kr" },
  NO1:  { code: "NO1", country: "NO", timezone: "Europe/Oslo",      currency: "NOK", unitLabel: "øre/kWh", currencySymbol: "kr" },
  NO2:  { code: "NO2", country: "NO", timezone: "Europe/Oslo",      currency: "NOK", unitLabel: "øre/kWh", currencySymbol: "kr" },
  NO3:  { code: "NO3", country: "NO", timezone: "Europe/Oslo",      currency: "NOK", unitLabel: "øre/kWh", currencySymbol: "kr" },
  NO4:  { code: "NO4", country: "NO", timezone: "Europe/Oslo",      currency: "NOK", unitLabel: "øre/kWh", currencySymbol: "kr" },
  NO5:  { code: "NO5", country: "NO", timezone: "Europe/Oslo",      currency: "NOK", unitLabel: "øre/kWh", currencySymbol: "kr" },
}

export const DEFAULT_AREA: AreaCode = "FI"

export function getAreaInfo(area: string | null | undefined): AreaInfo {
  const a = (area || DEFAULT_AREA) as AreaCode
  return AREAS[a] || AREAS[DEFAULT_AREA]
}

export const AREA_OPTIONS: { value: AreaCode; label: string }[] = [
  { value: "FI", label: "FI (Finland)" },
  { value: "SE1", label: "SE1 (Norra Norrland)" },
  { value: "SE2", label: "SE2 (Södra Norrland)" },
  { value: "SE3", label: "SE3 (Stockholm)" },
  { value: "SE4", label: "SE4 (Syd)" },
  { value: "NO1", label: "NO1 (Østlandet)" },
  { value: "NO2", label: "NO2 (Sørlandet)" },
  { value: "NO3", label: "NO3 (Midt)" },
  { value: "NO4", label: "NO4 (Nord)" },
  { value: "NO5", label: "NO5 (Vest)" },
]
