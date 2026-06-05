/**
 * Schema.org JSON-LD builders for the landing page. Returned as plain objects
 * and serialized into a <script type="application/ld+json"> in page.tsx.
 *
 * Facts here are sourced from docs/PRD.md and the live pricing section — no
 * invented claims. Notably there is NO aggregateRating: we have no real ratings
 * yet and never fake them.
 */
import {
  SITE_NAME,
  SITE_URL,
  SITE_DESCRIPTION,
  SITE_LONG_DESCRIPTION,
} from "@/lib/site"

type JsonLd = Record<string, unknown>

export function getWebSiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  }
}

export function getOrganizationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  }
}

export function getSoftwareApplicationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_LONG_DESCRIPTION,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    // Pay-per-session credit model, in DKK — mirrors the landing pricing section.
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "DKK",
      },
      {
        "@type": "Offer",
        name: "Single session",
        price: "25",
        priceCurrency: "DKK",
      },
      {
        "@type": "Offer",
        name: "5-session pack",
        price: "99",
        priceCurrency: "DKK",
      },
    ],
  }
}

/**
 * Builds FAQPage schema from the same `faqs` array the page renders, so the
 * structured data and the visible Q&A can never drift apart.
 */
export function getFaqPageSchema(faqs: ReadonlyArray<{ q: string; a: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: {
        "@type": "Answer",
        text: a,
      },
    })),
  }
}
