import { useState } from "react";
import { TopicInput } from "./components/TopicInput";
import { VoiceAgent } from "./components/VoiceAgent";
import { useVoiceAgent } from "./hooks/useVoiceAgent";

function App() {
  const [topic, setTopic] = useState("");
  const [started, setStarted] = useState(false);
  const agent = useVoiceAgent();

  const handleStart = (t: string) => {
    setTopic(t);
    setStarted(true);
    agent.start(t);
  };

  const handleRestart = () => {
    setStarted(false);
    setTopic("");
  };

  return (
    <div className="min-h-screen bg-linkedin-bg">
      {!started ? (
        <TopicInput
          onStart={handleStart}
          disabled={agent.status === "connecting"}
        />
      ) : (
        <VoiceAgent
          status={agent.status}
          transcripts={agent.transcripts}
          currentUserTranscript={agent.currentUserTranscript}
          linkedinPost={agent.linkedinPost}
          error={agent.error}
          topic={topic}
          onStop={agent.stop}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

export default App;
