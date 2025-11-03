"use client"

import { Button } from "@/components/ui/button"
import { Languages } from "lucide-react"
import type { Language } from "@/lib/translations"

interface LanguageSelectorProps {
  currentLanguage: Language
  onLanguageChange: (lang: Language) => void
}

export function LanguageSelector({ currentLanguage, onLanguageChange }: LanguageSelectorProps) {
  const languages: { code: Language; label: string }[] = [
    { code: "fi", label: "FI" },
    { code: "sv", label: "SV" },
    { code: "en", label: "EN" },
  ]

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
      <Languages className="ml-2 h-4 w-4 text-muted-foreground" />
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant={currentLanguage === lang.code ? "default" : "ghost"}
          size="sm"
          onClick={() => onLanguageChange(lang.code)}
          className="h-8 min-w-[2.5rem]"
        >
          {lang.label}
        </Button>
      ))}
    </div>
  )
}
