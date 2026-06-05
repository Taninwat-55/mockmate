import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  // Public pages only — auth-gated routes (dashboard, settings, interview) are
  // intentionally excluded.
  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ]
}
