"use client"
import * as React from 'react'
import { BowArrow, UserPlus } from "lucide-react"
import { useSignUp, useClerk } from '@clerk/nextjs'
import { cn } from "@/lib/utils"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Google } from '@/components/ui/svgs/google'

// --- Verification Component ---
function VerifyEmailLink() {
  const { handleEmailLinkVerification } = useClerk()
  const [error, setError] = React.useState('')
  const [verifying, setVerifying] = React.useState(true)
  const [success, setSuccess] = React.useState(false)

  React.useEffect(() => {
    async function verify() {
      try {
        await handleEmailLinkVerification(async (attempt) => {
          await attempt.completeSignUp()
          setSuccess(true)
        })
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
        <Button onClick={() => window.location.assign('/')} className="mt-4">
          go to dashboard
        </Button>
      </div>
    )
  }

  return null
}

// --- Main Form Component ---
export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const [emailAddress, setEmailAddress] = React.useState('')
  const [username, setUsername] = React.useState('')
  const [phoneNumber, setPhoneNumber] = React.useState<string | undefined>('')
  const [verifying, setVerifying] = React.useState(false)
  const [error, setError] = React.useState('')

  const { isLoaded, signUp } = useSignUp()
  if (!isLoaded) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setVerifying(false)

    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      setError('please enter a valid phone number.')
      return
    }

    try {
      await signUp!.create({
        emailAddress,
        username,
        phoneNumber
      })

      const { startEmailLinkFlow } = signUp!.createEmailLinkFlow({ strategy: "email_link" })

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
          we've sent a verification link to <b>{emailAddress}</b>. please click the link to complete your sign-up.
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

          <Field>
            <Button type="submit"><UserPlus />sign me up</Button>
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

// default page export for Next.js
export default function Page() {
  return <SignupForm className="max-w-md mx-auto mt-8" />
}