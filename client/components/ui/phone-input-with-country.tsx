"use client"

import { Phone } from "lucide-react"
import { useEffect, useMemo, useState, type ChangeEvent } from "react"

import { cn } from "@/lib/utils"

type CountryDialCode = {
  code: string
  label: string
  dial: string
  flag: string
}

const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { code: "FR", label: "France", dial: "+33", flag: "🇫🇷" },
  { code: "BE", label: "Belgique", dial: "+32", flag: "🇧🇪" },
  { code: "CH", label: "Suisse", dial: "+41", flag: "🇨🇭" },
  { code: "LU", label: "Luxembourg", dial: "+352", flag: "🇱🇺" },
  { code: "GB", label: "Royaume-Uni", dial: "+44", flag: "🇬🇧" },
  { code: "DE", label: "Allemagne", dial: "+49", flag: "🇩🇪" },
  { code: "ES", label: "Espagne", dial: "+34", flag: "🇪🇸" },
  { code: "IT", label: "Italie", dial: "+39", flag: "🇮🇹" },
  { code: "PT", label: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "NL", label: "Pays-Bas", dial: "+31", flag: "🇳🇱" },
  { code: "MA", label: "Maroc", dial: "+212", flag: "🇲🇦" },
  { code: "DZ", label: "Algérie", dial: "+213", flag: "🇩🇿" },
  { code: "TN", label: "Tunisie", dial: "+216", flag: "🇹🇳" },
  { code: "US", label: "États-Unis", dial: "+1", flag: "🇺🇸" },
  { code: "CA", label: "Canada", dial: "+1", flag: "🇨🇦" },
]

const DEFAULT_DIAL = "+33"

function splitPhoneValue(value: string): {
  dial: string
  localNumber: string
} {
  const trimmed = value.trim()
  if (!trimmed.startsWith("+")) {
    return { dial: DEFAULT_DIAL, localNumber: trimmed }
  }

  const matched = COUNTRY_DIAL_CODES.map((country) => country.dial)
    .sort((a, b) => b.length - a.length) // Plus long match first (+352 avant +35 puis +3)
    .find((dial) => trimmed.startsWith(dial))

  if (!matched) {
    return { dial: DEFAULT_DIAL, localNumber: trimmed }
  }

  return {
    dial: matched,
    localNumber: trimmed.slice(matched.length).trim(),
  }
}

export type PhoneInputWithCountryProps = {
  id?: string
  name?: string
  value: string
  onChange: (nextValue: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}

export function PhoneInputWithCountry({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder = "06 12 34 56 78",
  disabled,
  className,
  ariaInvalid,
  ariaDescribedBy,
}: PhoneInputWithCountryProps) {
  const initial = useMemo(() => splitPhoneValue(value), [value])
  const [selectedDial, setSelectedDial] = useState(initial.dial)
  const [localNumber, setLocalNumber] = useState(initial.localNumber)

  useEffect(() => {
    const next = splitPhoneValue(value)
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setSelectedDial(next.dial)
      setLocalNumber(next.localNumber)
    })
    return () => {
      cancelled = true
    }
  }, [value])

  function handleDialChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextDial = event.target.value
    setSelectedDial(nextDial)
    onChange(localNumber ? `${nextDial}${localNumber}` : "")
  }

  function handleNumberChange(event: ChangeEvent<HTMLInputElement>) {
    // Garde uniquement chiffres + espaces
    const sanitized = event.target.value.replace(/[^\d\s]/g, "")
    setLocalNumber(sanitized)
    onChange(sanitized ? `${selectedDial}${sanitized.replace(/\s/g, "")}` : "")
  }

  return (
    <div
      className={cn(
        "flex h-10 w-full overflow-hidden rounded-md border border-border bg-white",
        className,
      )}
    >
      <select
        value={selectedDial}
        onChange={handleDialChange}
        disabled={disabled}
        aria-label="Indicatif pays"
        className="h-full bg-slate-50 px-2 text-sm text-slate-700 focus:outline-none"
      >
        {COUNTRY_DIAL_CODES.map((country) => (
          <option key={`${country.code}-${country.dial}`} value={country.dial}>
            {country.flag} {country.dial} ({country.code})
          </option>
        ))}
      </select>

      <div className="relative flex-1">
        <Phone
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={localNumber}
          onChange={handleNumberChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className="h-full w-full bg-transparent ps-9 pe-3 text-sm text-slate-700 focus:outline-none"
        />
      </div>
    </div>
  )
}
