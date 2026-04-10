import express from "express";
import { createServer } from "http";
import https from "https";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const PORT = parseInt(process.env.PORT || "3001", 10);
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || "";
const ASSEMBLYAI_WS_URL =
  "wss://speech-to-speech.us.assemblyai.com/v1/realtime";

if (!ASSEMBLYAI_API_KEY) {
  console.error(
    "ASSEMBLYAI_API_KEY is not set. Voice agent will not work."
  );
} else {
  console.log(
    `ASSEMBLYAI_API_KEY is set (${ASSEMBLYAI_API_KEY.length} chars, starts with ${ASSEMBLYAI_API_KEY.slice(0, 4)}...)`
  );
}

function buildSystemPrompt(topic: string): string {
  return `You are a professional LinkedIn post interviewer. Your job is to interview the user about the following topic and then craft a compelling LinkedIn post based on their answers.

Topic: "${topic}"

## Interview Phase
- Greet the user warmly and briefly explain that you'll ask them a few questions to craft a great LinkedIn post about the topic.
- Ask 3-4 focused, open-ended questions one at a time. Wait for the user to answer each question before asking the next.
- Questions should draw out personal stories, unique insights, specific examples, and actionable advice.
- Be conversational and encouraging. React to their answers naturally before asking the next question.
- Keep each question concise and clear.

## Post Generation Phase
- After gathering enough material (3-4 questions), tell the user you have what you need and you'll now craft their post.
- Use the generate_post tool to create the LinkedIn post and present it to the user.
- The post should follow LinkedIn best practices: strong hook in the first line, short paragraphs, personal storytelling mixed with insights, a clear takeaway, and a call-to-action or question at the end.
- The tone should be professional but authentic — not overly corporate or salesy. Think "smart colleague sharing a lesson" not "motivational poster."
- Keep the post between 150-250 words.
- Do NOT use hashtags excessively (3 max at the end).
- Do NOT use emojis excessively (a few are ok for emphasis).
- Avoid buzzwords like "leverage", "synergy", "game-changer" etc.

After presenting the post via the tool, ask the user if they'd like any changes.`;
}

// Create a reusable HTTPS agent for outbound WebSocket connections
const agent = new https.Agent({
  keepAlive: true,
  timeout: 15000,
});

wss.on("connection", (browserWs, req) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const topic = decodeURIComponent(url.searchParams.get("topic") || "");

  if (!topic) {
    browserWs.send(
      JSON.stringify({ type: "error", message: "No topic provided" })
    );
    browserWs.close();
    return;
  }

  if (!ASSEMBLYAI_API_KEY) {
    browserWs.send(
      JSON.stringify({
        type: "error",
        message: "Server is missing ASSEMBLYAI_API_KEY configuration.",
      })
    );
    browserWs.close();
    return;
  }

  console.log(`[ws] New connection — topic: "${topic}"`);
  console.log(`[assemblyai] Connecting to ${ASSEMBLYAI_WS_URL}...`);

  let assemblyWs: WebSocket | null = null;
  let sessionReady = false;

  // Connect to AssemblyAI with explicit agent and options
  assemblyWs = new WebSocket(ASSEMBLYAI_WS_URL, {
    headers: {
      Authorization: `Bearer ${ASSEMBLYAI_API_KEY}`,
    },
    agent,
    handshakeTimeout: 15000,
    perMessageDeflate: false,
  });

  assemblyWs.on("open", () => {
    console.log("[assemblyai] Connected successfully");
  });

  assemblyWs.on("message", (data) => {
    if (browserWs.readyState !== WebSocket.OPEN) return;

    const msg = JSON.parse(data.toString());

    switch (msg.type) {
      case "session.ready":
        console.log("[assemblyai] Session ready:", msg.session_id);
        sessionReady = true;

        // Configure the session with our interviewer prompt and tool
        const sessionConfig = {
          type: "session.update",
          session: {
            system_prompt: buildSystemPrompt(topic),
            greeting: `Hi there! I'm excited to help you craft a LinkedIn post about "${topic}". I'll ask you a few questions to understand your perspective, and then I'll write a polished post for you. Ready to get started?`,
            tools: [
              {
                type: "function",
                name: "generate_post",
                description:
                  "Generate the final LinkedIn post based on the interview. Call this when you have gathered enough information from the user (after 3-4 questions).",
                parameters: {
                  type: "object",
                  properties: {
                    post_content: {
                      type: "string",
                      description:
                        "The full LinkedIn post content, formatted and ready to publish",
                    },
                    hook: {
                      type: "string",
                      description:
                        "The opening hook line of the post (first sentence)",
                    },
                  },
                  required: ["post_content", "hook"],
                },
              },
            ],
            turn_detection: {
              min_end_of_turn_silence_ms: 200,
              max_turn_silence_ms: 1500,
              interrupt_response: true,
            },
          },
        };
        assemblyWs!.send(JSON.stringify(sessionConfig));

        // Forward session.ready to browser
        browserWs.send(JSON.stringify(msg));
        break;

      case "session.updated":
        console.log("[assemblyai] Session configured");
        browserWs.send(JSON.stringify(msg));
        break;

      case "reply.audio":
        browserWs.send(JSON.stringify(msg));
        break;

      case "reply.started":
        browserWs.send(JSON.stringify(msg));
        break;

      case "reply.done": {
        browserWs.send(JSON.stringify(msg));

        // Handle any pending tool calls
        if (pendingToolCalls.length > 0) {
          for (const toolResult of pendingToolCalls) {
            assemblyWs!.send(JSON.stringify(toolResult));
          }
          pendingToolCalls.length = 0;
        }
        break;
      }

      case "tool.call":
        console.log("[assemblyai] Tool call:", msg.name, msg.args);

        if (msg.name === "generate_post") {
          browserWs.send(
            JSON.stringify({
              type: "linkedin_post",
              content: msg.args.post_content,
              hook: msg.args.hook,
            })
          );

          pendingToolCalls.push({
            type: "tool.result",
            call_id: msg.call_id,
            result: JSON.stringify({
              success: true,
              message:
                "Post has been generated and displayed to the user. Ask them if they would like any changes.",
            }),
          });
        }
        break;

      case "transcript.user":
      case "transcript.user.delta":
      case "transcript.agent":
        browserWs.send(JSON.stringify(msg));
        break;

      case "input.speech.started":
      case "input.speech.stopped":
        browserWs.send(JSON.stringify(msg));
        break;

      case "session.error":
        console.error("[assemblyai] Error:", msg);
        browserWs.send(JSON.stringify(msg));
        break;

      default:
        console.log("[assemblyai] Unknown message type:", msg.type);
        browserWs.send(JSON.stringify(msg));
    }
  });

  const pendingToolCalls: Array<{
    type: string;
    call_id: string;
    result: string;
  }> = [];

  assemblyWs.on("unexpected-response", (_req, res) => {
    let body = "";
    res.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    res.on("end", () => {
      console.error(
        `[assemblyai] Unexpected response: ${res.statusCode} ${res.statusMessage} — ${body}`
      );
      if (browserWs.readyState === WebSocket.OPEN) {
        browserWs.send(
          JSON.stringify({
            type: "error",
            message: `AssemblyAI returned ${res.statusCode}: ${body || res.statusMessage}`,
          })
        );
      }
    });
  });

  assemblyWs.on("error", (err) => {
    console.error("[assemblyai] WebSocket error:", err.message);
    console.error("[assemblyai] Error details:", err);
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(
        JSON.stringify({
          type: "error",
          message: `Voice agent connection failed: ${err.message}`,
        })
      );
    }
  });

  assemblyWs.on("close", (code, reason) => {
    console.log(`[assemblyai] Closed: ${code} ${reason.toString()}`);
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(JSON.stringify({ type: "session.closed" }));
      browserWs.close();
    }
  });

  // Handle messages from browser
  browserWs.on("message", (data) => {
    if (!assemblyWs || assemblyWs.readyState !== WebSocket.OPEN) return;

    const msg = JSON.parse(data.toString());

    if (msg.type === "input.audio" && sessionReady) {
      assemblyWs.send(JSON.stringify(msg));
    }
  });

  browserWs.on("close", () => {
    console.log("[ws] Browser disconnected");
    if (assemblyWs && assemblyWs.readyState === WebSocket.OPEN) {
      assemblyWs.close();
    }
  });
});

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    apiKeySet: !!ASSEMBLYAI_API_KEY,
  });
});

// Serve the built frontend
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

server.listen(PORT, () => {
  console.log(`LinkedIn Voice server running on port ${PORT}`);
});
