import { ImageResponse } from "next/og"

import { SITE_NAME, SITE_TAGLINE } from "@/lib/site"

// Code-generated social share image, no external logo asset dependency. Drawn
// in the brand's paper and ink (#82) to match the site.
export const alt = "MockMate, AI mock interviews with graded feedback"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// The ◆ mark as an SVG data URI (Satori renders <img> reliably).
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3.5 L20.5 12 L12 20.5 L3.5 12 Z" fill="#1c1a17" stroke="#1c1a17" stroke-width="1.5" stroke-linejoin="round"/></svg>`
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
          backgroundColor: "#f8f6f1",
          color: "#1c1a17",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <img src={markDataUri} width={96} height={96} alt="" />
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
            color: "#6f6a63",
            textAlign: "center",
          }}
        >
          {SITE_TAGLINE}
        </div>
        <div
          style={{
            marginTop: "56px",
            fontSize: 26,
            color: "#8a847c",
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
