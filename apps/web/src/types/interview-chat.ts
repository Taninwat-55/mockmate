import type { UIMessage } from "ai"

import type { StageProgress } from "@/lib/interview-engine"

// Metadata the chat route attaches to the streamed assistant message so the client
// knows when the interview just ended (the last question was answered) without
// polling, and where the interview now is for the progress indicator (#72).
// Read in `InterviewChat`'s `onFinish`.
export type InterviewMessageMetadata = {
  sessionStatus?: "IN_PROGRESS" | "COMPLETED"
  progress?: StageProgress
}

// The app's UIMessage shape — a plain text-part message carrying the metadata above.
// Shared by the streaming route and the `useChat` client so both agree on the type.
export type InterviewUIMessage = UIMessage<InterviewMessageMetadata>
