# ADR-005: Plain Text Textarea over PDF Upload for Resume Input

**Date:** 2026-06-02  
**Status:** Accepted

---

## Context

Users need to provide their resume to the application so the AI can use it as context for generating relevant interview questions. The question is how that input is collected.

PDF upload is the natural expectation for a resume-handling feature. However, the MVP's primary goal is to validate the core interview loop — that the AI can generate good questions, conduct a realistic session, and produce useful feedback. The resume input mechanism is a UX concern, not a core loop concern.

---

## Options Considered

- **PDF upload with server-side parsing (`pdf-parse` / `pdfjs-dist`)** — users upload a PDF, the server extracts text and passes it to the LLM. Ruled out: PDF parsing is unreliable across file types (scanned PDFs have no text layer, heavily formatted resumes extract as garbled text, non-standard font encodings cause failures). Requires defensive handling for edge cases before the core loop is even validated.
- **PDF upload via Gemini Files API** — upload the PDF directly to Google's Files API and pass it as a file reference to the model, bypassing custom parsing. Cleaner, but requires file upload handling, size and type validation, and either temporary storage or S3. S3 is a Phase 2 feature; building file storage before the product is validated is premature infrastructure.
- **Plain text textarea** — user pastes their resume as plain text. Zero parsing complexity, zero file handling, zero storage requirements. The LLM receives clean text input regardless of the original document format.

---

## Decision

Use a **plain text textarea** for resume input in MVP. Users paste their resume text directly into the form alongside the job description.

PDF upload is deferred to Phase 2 and will be implemented using the Gemini Files API once S3 file storage is in place. That integration path — S3 for storage, Gemini Files API for model input — avoids custom parsing entirely and is the correct long-term solution.

---

## Consequences

**Positive**
- Zero parsing code to write or maintain in MVP
- No file storage infrastructure required for Phase 1
- The LLM receives clean, unambiguous text — no extraction artifacts or encoding issues
- Unblocks core loop development immediately; resume input is a 30-minute task instead of a multi-day one

**Negative / trade-offs**
- Slightly more friction for users: copy-pasting from a PDF or Google Doc is a 10-second operation but it is still a manual step
- The product feels less polished than a file upload experience — acceptable for MVP validation, not acceptable at production scale
- Users with resumes only available as scanned PDFs (uncommon for developers but possible) cannot participate in MVP testing
