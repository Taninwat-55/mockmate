import type { UIMessage } from "ai"

// Metadata the chat route attaches to the streamed assistant message so the client
// knows when the interview just ended (the 5th question was answered) without polling.
// Read in `InterviewChat`'s `onFinish` to refresh into the completed state.
export type InterviewMessageMetadata = {
  sessionStatus?: "IN_PROGRESS" | "COMPLETED"
}

// The app's UIMessage shape — a plain text-part message carrying the metadata above.
// Shared by the streaming route and the `useChat` client so both agree on the type.
export type InterviewUIMessage = UIMessage<InterviewMessageMetadata>
