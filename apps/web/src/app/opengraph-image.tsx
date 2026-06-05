import { ImageResponse } from "next/og"

import { SITE_NAME, SITE_TAGLINE } from "@/lib/site"

// Code-generated social share image — no external logo asset dependency. Drawn
// in the brand's monochrome palette to match the site.
export const alt = "MockMate — AI mock interviews with graded feedback"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Terminal `>_` mark as an SVG data URI (Satori renders <img> reliably).
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fafafa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.25" y="3.75" width="19.5" height="16.5" rx="3"/><path d="M6.5 9.5 L10 12 L6.5 14.5"/><path d="M12.5 14.75 H16.5"/></svg>`
const markDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(markSvg)}`

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          color: "#fafafa",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <img src={markDataUri} width={120} height={120} alt="" />
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            {SITE_NAME}
          </div>
        </div>
        <div
          style={{
            marginTop: "40px",
            fontSize: 38,
            color: "#a1a1a1",
            textAlign: "center",
          }}
        >
          {SITE_TAGLINE}
        </div>
        <div
          style={{
            marginTop: "56px",
            fontSize: 26,
            color: "#6b6b6b",
            letterSpacing: "0.04em",
          }}
        >
          mockmate.space
        </div>
      </div>
    ),
    { ...size },
  )
}
