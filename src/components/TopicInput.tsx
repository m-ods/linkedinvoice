import { useState } from "react";

interface TopicInputProps {
  onStart: (topic: string) => void;
  disabled: boolean;
}

export function TopicInput({ onStart, disabled }: TopicInputProps) {
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (topic.trim()) {
      onStart(topic.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      {/* LinkedIn-style logo */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-linkedin-blue rounded-lg flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 text-white"
              fill="currentColor"
            >
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-semibold text-linkedin-text leading-tight">
              LinkedIn Voice
            </h1>
            <p className="text-sm text-linkedin-text-secondary">
              AI-powered post writer
            </p>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-linkedin-card rounded-xl shadow-md border border-linkedin-border w-full max-w-lg p-8">
        <h2 className="text-xl font-semibold text-linkedin-text mb-2">
          What's your post about?
        </h2>
        <p className="text-linkedin-text-secondary text-sm mb-6">
          Enter a topic and our voice AI will interview you to craft the perfect
          LinkedIn post.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder='e.g. "Lessons from scaling our team from 5 to 50"'
            className="w-full px-4 py-3 rounded-lg border border-linkedin-border bg-white text-linkedin-text placeholder:text-linkedin-text-secondary/60 focus:outline-none focus:border-linkedin-blue focus:ring-2 focus:ring-linkedin-blue/20 transition-all text-sm"
            disabled={disabled}
            autoFocus
          />
          <button
            type="submit"
            disabled={disabled || !topic.trim()}
            className="w-full py-3 px-6 bg-linkedin-blue text-white font-semibold rounded-full hover:bg-linkedin-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <span className="flex items-center justify-center gap-2">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              Start Voice Interview
            </span>
          </button>
        </form>

        <div className="mt-6 flex items-start gap-3 text-left bg-linkedin-bg rounded-lg p-4">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 text-linkedin-blue flex-shrink-0 mt-0.5"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          <p className="text-xs text-linkedin-text-secondary leading-relaxed">
            The AI will ask you 3-4 questions about your topic, then generate a
            polished LinkedIn post based on your answers. Make sure your
            microphone is enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
