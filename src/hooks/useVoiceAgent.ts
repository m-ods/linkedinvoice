import { useState, useRef, useCallback } from "react";
import { createMicrophoneStream, AudioPlayer } from "../lib/audio";

export type AgentStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "listening"
  | "agent_speaking"
  | "error"
  | "ended";

export interface TranscriptEntry {
  role: "user" | "agent";
  text: string;
  id: string;
}

interface UseVoiceAgentReturn {
  status: AgentStatus;
  transcripts: TranscriptEntry[];
  currentUserTranscript: string;
  linkedinPost: string | null;
  error: string | null;
  start: (topic: string) => void;
  stop: () => void;
}

export function useVoiceAgent(): UseVoiceAgentReturn {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [currentUserTranscript, setCurrentUserTranscript] = useState("");
  const [linkedinPost, setLinkedinPost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const micRef = useRef<{ stop: () => void } | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const transcriptIdRef = useRef(0);

  const cleanup = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setStatus("ended");
  }, [cleanup]);

  const start = useCallback(
    (topic: string) => {
      cleanup();
      setTranscripts([]);
      setCurrentUserTranscript("");
      setLinkedinPost(null);
      setError(null);
      setStatus("connecting");

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?topic=${encodeURIComponent(topic)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const player = new AudioPlayer();
      playerRef.current = player;

      ws.onopen = () => {
        console.log("[ws] Connected to server");
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "session.ready":
            console.log("[ws] Session ready");
            setStatus("ready");

            // Start microphone
            createMicrophoneStream((base64) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({ type: "input.audio", audio: base64 })
                );
              }
            }).then((mic) => {
              micRef.current = mic;
              setStatus("listening");
            });
            break;

          case "session.updated":
            console.log("[ws] Session configured");
            break;

          case "input.speech.started":
            // User started speaking — interrupt agent audio
            player.interrupt();
            setStatus("listening");
            break;

          case "input.speech.stopped":
            break;

          case "transcript.user.delta":
            setCurrentUserTranscript(msg.text || msg.transcript || msg.delta || "");
            break;

          case "transcript.user":
            // Final user transcript
            if (msg.text || msg.transcript) {
              const id = `user-${++transcriptIdRef.current}`;
              setTranscripts((prev) => [
                ...prev,
                { role: "user", text: msg.text || msg.transcript, id },
              ]);
            }
            setCurrentUserTranscript("");
            break;

          case "reply.started":
            setStatus("agent_speaking");
            break;

          case "reply.audio":
            // AssemblyAI sends audio as "data", not "audio"
            player.enqueue(msg.data || msg.audio);
            break;

          case "transcript.agent":
            if (msg.text || msg.transcript) {
              const id = `agent-${++transcriptIdRef.current}`;
              setTranscripts((prev) => [
                ...prev,
                { role: "agent", text: msg.text || msg.transcript, id },
              ]);
            }
            break;

          case "reply.done":
            setStatus("listening");
            break;

          case "linkedin_post":
            setLinkedinPost(msg.content);
            break;

          case "session.closed":
            setStatus("ended");
            break;

          case "session.error":
          case "error":
            setError(msg.message || msg.error || "An error occurred");
            setStatus("error");
            break;
        }
      };

      ws.onerror = () => {
        setError("Connection error. Make sure the server is running.");
        setStatus("error");
      };

      ws.onclose = () => {
        if (status !== "ended" && status !== "error") {
          setStatus("ended");
        }
      };
    },
    [cleanup, status]
  );

  return {
    status,
    transcripts,
    currentUserTranscript,
    linkedinPost,
    error,
    start,
    stop,
  };
}
