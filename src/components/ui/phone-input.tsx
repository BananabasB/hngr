import * as React from "react"
import PhoneInput, { Country, getCountries, getCountryCallingCode } from "react-phone-number-input"
import { parsePhoneNumberWithError as parsePhoneNumber, AsYouType } from 'libphonenumber-js'
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// common country abbreviations
const countryAbbreviations: Record<string, string[]> = {
  gb: ['uk', 'britain', 'england', 'scotland', 'wales', 'northern', 'northern ireland'],
  us: ['usa', 'america', 'us'],
  ae: ['uae'],
  ch: ['switzerland'],
  kr: ['korea'],
  ru: ['russia'],
  za: ['south africa'],
}

// get all countries from the library
const countries = getCountries().map(country => {
  const name = getCountryName(country)
  const abbrs = countryAbbreviations[country.toLowerCase()] || []
  return {
    value: country.toLowerCase(),
    label: name,
    dialCode: `+${getCountryCallingCode(country)}`,
    searchValue: [
      country.toLowerCase(),
      name.toLowerCase(),
      ...abbrs
    ].join(' ')
  }
})

// get country name in user's locale, safely
function getCountryName(country: string) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(country) || country
  } catch (e) {
    return country
  }
}

interface PhoneInputWrapperProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string
  onChange?: (value?: string) => void
  error?: boolean // add support for error state styling
}

export function PhoneInputWrapper({
  value,
  onChange,
  className,
  error,
  ...props
}: PhoneInputWrapperProps) {
  const [country, setCountry] = React.useState<Country>("GB")
  const [open, setOpen] = React.useState(false)
  // local display value (national format) so the input shows a friendly format
  const [display, setDisplay] = React.useState<string>(value || '')

  // Handle country selection from dropdown
  const handleCountryChange = (newCountry: Country | undefined) => {
    if (!newCountry) return
    setCountry(newCountry)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatter = new AsYouType(country)
    const formatted = formatter.input(e.target.value)
    // show the formatted national number in the input
    setDisplay(formatted)

    // try to parse and pass an E.164 value to the parent for validation/storage
    try {
      const parsed = parsePhoneNumber(formatted, country)
      if (parsed && parsed.isValid && parsed.isValid()) {
        onChange?.(parsed.format('E.164'))
      } else {
        // not valid yet — pass undefined so parent knows it's incomplete
        onChange?.(undefined)
      }
    } catch (e) {
      onChange?.(undefined)
    }
  }

  const selectedCountry = countries.find((c) => c.value.toUpperCase() === country)

  // when the controlled `value` (E.164) changes from parent, update our display
  React.useEffect(() => {
    if (!value) {
      setDisplay('')
      return
    }

    try {
      const parsed = parsePhoneNumber(value)
      if (parsed) {
        // show national format for the selected country
        setDisplay(parsed.format('NATIONAL'))
        return
      }
    } catch (e) {
      // fallback to raw value
    }

    setDisplay(value)
  }, [value, country])

  return (
    <div className="flex w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[140px] shrink-0 justify-between rounded-r-none border-r-0"
          >
            {selectedCountry?.value.toUpperCase() || "Select"}
            <span className="ml-2 text-sm text-muted-foreground">
              {selectedCountry?.dialCode}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0">
          <Command filter={(value, search) => {
              if (!search) return 1
              const item = value.toLowerCase()
              const searchTerm = search.toLowerCase()
              
              // check if it matches an abbreviation exactly
              const country = countries.find(c => c.searchValue === item)
              if (country) {
                const abbrs = countryAbbreviations[country.value] || []
                if (abbrs.some(abbr => abbr.toLowerCase() === searchTerm)) {
                  return 1
                }
              }
              
              // otherwise use built-in fuzzy search
              return item.includes(searchTerm) ? 0.5 : 0
            }}>
            <CommandInput placeholder="Search country..." />
            <CommandEmpty>no country found.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {countries
                .map((c) => (
                  <CommandItem
                    key={c.value}
                    value={c.searchValue}
                    onSelect={() => {
                      setCountry(c.value.toUpperCase() as Country)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        country === c.value.toUpperCase() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{c.label}</span>
                    <span className="ml-auto text-sm text-muted-foreground">{c.dialCode}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      <input
        {...props}
        type="tel"
        value={display}
        onChange={handleInputChange}
        className={cn(
          "flex-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "rounded-l-none",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
      />
    </div>
  )
}