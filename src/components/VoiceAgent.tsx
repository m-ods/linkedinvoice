import type { AgentStatus, TranscriptEntry } from "../hooks/useVoiceAgent";

interface VoiceAgentProps {
  status: AgentStatus;
  transcripts: TranscriptEntry[];
  currentUserTranscript: string;
  linkedinPost: string | null;
  error: string | null;
  topic: string;
  onStop: () => void;
  onRestart: () => void;
}

function StatusIndicator({ status }: { status: AgentStatus }) {
  if (status === "connecting" || status === "ready") {
    return (
      <div className="flex items-center gap-2 text-linkedin-text-secondary text-sm">
        <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
        Connecting...
      </div>
    );
  }

  if (status === "listening") {
    return (
      <div className="flex items-center gap-2 text-linkedin-green text-sm font-medium">
        <div className="relative">
          <div className="w-3 h-3 rounded-full bg-linkedin-green" />
          <div className="absolute inset-0 w-3 h-3 rounded-full bg-linkedin-green animate-pulse-ring" />
        </div>
        Listening...
      </div>
    );
  }

  if (status === "agent_speaking") {
    return (
      <div className="flex items-center gap-3 text-linkedin-blue text-sm font-medium">
        <div className="flex items-end gap-0.5 h-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1 bg-linkedin-blue rounded-full animate-waveform"
              style={{
                animationDelay: `${i * 0.15}s`,
                height: "8px",
              }}
            />
          ))}
        </div>
        AI is speaking...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        Error
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div className="flex items-center gap-2 text-linkedin-text-secondary text-sm">
        <div className="w-3 h-3 rounded-full bg-gray-400" />
        Session ended
      </div>
    );
  }

  return null;
}

function TranscriptView({
  transcripts,
  currentUserTranscript,
}: {
  transcripts: TranscriptEntry[];
  currentUserTranscript: string;
}) {
  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {transcripts.map((entry) => (
        <div
          key={entry.id}
          className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              entry.role === "user"
                ? "bg-linkedin-blue text-white rounded-br-md"
                : "bg-white border border-linkedin-border text-linkedin-text rounded-bl-md"
            }`}
          >
            {entry.text}
          </div>
        </div>
      ))}
      {currentUserTranscript && (
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm bg-linkedin-blue/70 text-white italic">
            {currentUserTranscript}...
          </div>
        </div>
      )}
    </div>
  );
}

function PostPreview({
  content,
  onCopy,
}: {
  content: string;
  onCopy: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-linkedin-border overflow-hidden">
      <div className="p-4 border-b border-linkedin-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 text-linkedin-green"
            fill="currentColor"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span className="text-sm font-semibold text-linkedin-text">
            Your LinkedIn Post
          </span>
        </div>
        <button
          onClick={onCopy}
          className="text-xs text-linkedin-blue hover:text-linkedin-blue-hover font-semibold px-3 py-1.5 rounded-full hover:bg-linkedin-blue/10 transition-colors"
        >
          Copy to clipboard
        </button>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-linkedin-blue to-linkedin-light-blue flex items-center justify-center text-white font-bold text-lg">
            Y
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-linkedin-text">You</p>
            <p className="text-xs text-linkedin-text-secondary">Just now</p>
          </div>
        </div>
        <div className="text-sm text-linkedin-text whitespace-pre-wrap leading-relaxed text-left">
          {content}
        </div>
      </div>
      <div className="px-5 py-3 border-t border-linkedin-border flex items-center gap-6">
        {["Like", "Comment", "Repost", "Send"].map((action) => (
          <span
            key={action}
            className="text-xs text-linkedin-text-secondary font-medium"
          >
            {action}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VoiceAgent({
  status,
  transcripts,
  currentUserTranscript,
  linkedinPost,
  error,
  topic,
  onStop,
  onRestart,
}: VoiceAgentProps) {
  const handleCopy = () => {
    if (linkedinPost) {
      navigator.clipboard.writeText(linkedinPost);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
      {/* Header */}
      <div className="bg-linkedin-card rounded-xl border border-linkedin-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linkedin-blue rounded-lg flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <div className="text-left">
              <h2 className="text-base font-semibold text-linkedin-text">
                Voice Interview
              </h2>
              <p className="text-xs text-linkedin-text-secondary truncate max-w-xs">
                Topic: {topic}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusIndicator status={status} />
            {status !== "ended" && status !== "error" ? (
              <button
                onClick={onStop}
                className="text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors"
              >
                End
              </button>
            ) : (
              <button
                onClick={onRestart}
                className="text-xs text-linkedin-blue hover:text-linkedin-blue-hover font-semibold px-3 py-1.5 rounded-full hover:bg-linkedin-blue/10 transition-colors"
              >
                New Interview
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-3">
            {error}
          </div>
        )}
      </div>

      {/* Transcript */}
      {transcripts.length > 0 && (
        <div className="bg-linkedin-card rounded-xl border border-linkedin-border p-4">
          <h3 className="text-xs font-semibold text-linkedin-text-secondary uppercase tracking-wider mb-3">
            Conversation
          </h3>
          <TranscriptView
            transcripts={transcripts}
            currentUserTranscript={currentUserTranscript}
          />
        </div>
      )}

      {/* Waiting for conversation to begin */}
      {transcripts.length === 0 &&
        (status === "connecting" || status === "ready") && (
          <div className="bg-linkedin-card rounded-xl border border-linkedin-border p-8 text-center">
            <div className="inline-flex items-center gap-2 text-linkedin-text-secondary text-sm">
              <svg
                className="animate-spin w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Setting up your interview...
            </div>
          </div>
        )}

      {/* LinkedIn Post Preview */}
      {linkedinPost && (
        <PostPreview content={linkedinPost} onCopy={handleCopy} />
      )}
    </div>
  );
}
