import * as React from 'react' // imported React for state hooks
import { BowArrow, Check, ChevronsUpDown } from "lucide-react"
import { useClerk } from "@clerk/nextjs"; // ⬅️ clerk imports
import { useSignUp } from "@clerk/nextjs/legacy";
import PhoneInput from 'react-phone-number-input'
import type { Country } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { countries } from "@/lib/countries"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Google } from './ui/svgs/google'

// --- Verification Component (New) ---
// This is the component that will handle the redirect after the user clicks the link
function VerifyEmailLink() {
  const { handleEmailLinkVerification } = useClerk()
  const [error, setError] = React.useState('')
  const [verifying, setVerifying] = React.useState(true)
  const [success, setSuccess] = React.useState(false)

  React.useEffect(() => {
    // This hook runs once when the component mounts after the redirect
    async function verify() {
      try {
        await handleEmailLinkVerification((async (attempt: any) => {
          // You could inspect the attempt status here if needed
          await attempt.completeSignUp()
          setSuccess(true)
        }) as any)
      } catch (err: any) {
        console.error('Clerk verification error:', JSON.stringify(err, null, 2))
        setError(err.errors?.[0]?.longMessage || 'an error occurred during verification.')
      } finally {
        setVerifying(false)
      }
    }
    verify()
  }, [handleEmailLinkVerification])

  if (verifying) {
    return (
      <div className="text-center p-6">
        <p>verifying your email link...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-6">
        <p className="text-red-500">error: {error}</p>
        <p className="mt-2">please try signing up again.</p>
        <Button onClick={() => window.location.assign('/sign-up')} className="mt-4">
          go to sign up
        </Button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center p-6">
        <h2 className="text-xl font-bold text-green-600">success!</h2>
        <p>you are now signed up and logged in.</p>
        {/* you might redirect the user to a dashboard here */}
        <Button onClick={() => window.location.assign('/')} className="mt-4">
          go to dashboard
        </Button>
      </div>
    )
  }

  return null
}

// --- Main Form Component (Patched) ---
// Custom country combobox used as a country picker for react-phone-number-input.
// It uses the project's shadcn `Command` component inside a `Popover` so the
// picker is searchable and keyboard-friendly.
function CountrySelect({ value, onChange }: { value?: string | null; onChange: (c?: string | null) => void }) {
  const selected = (value || '').toUpperCase()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[170px] justify-between">
          <span className="flex items-center gap-2">
            {/* find country matching selected (stored lower/upper tolerant) */}
            <span>
              {countries.find((c) => c.value.toUpperCase() === selected)?.label ?? 'Country'}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandEmpty>no country found.</CommandEmpty>
          <CommandGroup className="max-h-[220px] overflow-auto">
            {countries.map((c) => (
              <CommandItem
                key={c.value}
                value={c.value}
                onSelect={() => onChange(c.value.toUpperCase())}
              >
                <Check className={cn('mr-2 h-4 w-4', (value || '').toUpperCase() === c.value.toUpperCase() ? 'opacity-100' : 'opacity-0')} />
                <span className="mr-2">{c.label}</span>
                <span className="ml-auto text-sm text-muted-foreground">{c.dialCode}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const [emailAddress, setEmailAddress] = React.useState('')
  const [username, setUsername] = React.useState('')
    const [phoneNumber, setPhoneNumber] = React.useState<string>()
  // controlled country used by react-phone-number-input (ISO 3166-1 alpha-2, uppercase)
  const [country, setCountry] = React.useState<Country | undefined>('GB')
  const [verifying, setVerifying] = React.useState(false)
  const [error, setError] = React.useState('')

  const { isLoaded, signUp } = useSignUp()
  if (!isLoaded) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setVerifying(false)

    try {
      // 1. create the sign-up attempt
      await signUp!.create({ 
        emailAddress, 
        username, 
        phoneNumber: phoneNumber || undefined
      })

      // 2. start email link flow
      const { startEmailLinkFlow } = signUp!.createEmailLinkFlow()

      const protocol = window.location.protocol
      const host = window.location.host

      await startEmailLinkFlow({
        redirectUrl: `${protocol}//${host}/sign-up/verify`,
      })

      setVerifying(true)
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2))
      const clerkError = err.errors?.[0]?.longMessage
      setError(clerkError || 'an unexpected error occurred.')
    }
  }

  if (error) {
    return (
      <div className="text-center p-6">
        <p className="text-red-500">error: {error}</p>
        <Button onClick={() => setError('')} className="mt-4">
          try again
        </Button>
      </div>
    )
  }

  if (verifying) {
    return (
      <div className="text-center p-6">
        <h2 className="text-xl font-bold">check your email</h2>
        <p className="mt-2">
          we've sent a verification link to **{emailAddress}**. please click the link to complete your sign-up.
        </p>
        <Button onClick={() => setVerifying(false)} variant="outline" className="mt-4">
          back to form
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a href="#" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md">
                <BowArrow />
              </div>
              <span className="sr-only">hngr</span>
            </a>
            <h1 className="text-xl font-bold">welcome to hngr</h1>
            <FieldDescription>
              already have an account? <a href="#">Sign in</a>
            </FieldDescription>
          </div>

          {/* username */}
          <Field>
            <FieldLabel htmlFor="username">username</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder="your username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>

          {/* email */}
          <Field>
            <FieldLabel htmlFor="email">email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
            />
          </Field>

          {/* phone */}
          <Field>
            <FieldLabel htmlFor="phone">phone number</FieldLabel>
              <div className="flex gap-2">
                <div className="shrink-0">
                  <CountrySelect value={country} onChange={(c) => setCountry(c as Country | undefined)} />
                </div>
                <div className="flex-1">
                  <PhoneInput
                    id="phone"
                    placeholder="Enter phone number"
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    country={country}
                    onCountryChange={setCountry}
                    // hide the library's native country select, we render our own combobox
                    countrySelectComponent={() => null}
                    className={cn(
                      "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  />
                </div>
              </div>
          </Field>

          <Field>
            <Button type="submit">create account</Button>
          </Field>

          <FieldSeparator>or</FieldSeparator>
          <Field className="grid gap-4 sm:grid-cols-2">
            <Button variant="outline" type="button" disabled>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg> 
              continue with apple
            </Button>
            <Button variant="outline" type="button" disabled>
              <Google />
              continue with google
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center">
        by clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}