"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

// Kicks off Stripe Checkout for a credit pack: POSTs to the checkout route and
// sends the browser to the returned hosted-checkout URL. Credits are granted
// server-side in the webhook on payment completion — never here.
export function BuyButton({
  pack,
  children,
}: {
  pack: "single" | "five"
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(false)

  async function startCheckout() {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      })
      const data: { url?: string; error?: string } = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Couldn't start checkout. Please try again.")
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      toast.error("Couldn't start checkout. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Button onClick={startCheckout} disabled={loading} className="w-full">
      {loading ? "Redirecting…" : children}
    </Button>
  )
}
