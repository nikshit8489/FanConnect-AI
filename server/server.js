
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

const FRONTEND_URL = "https://fanconnect-ai-frontend.onrender.com";

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: "20kb" }));

// ========================================
// REAL-TIME TRIBE CHAT
// ========================================

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("Fan connected:", socket.id);

  socket.on("join-room", ({ roomId, username, team }) => {
    if (
      typeof roomId !== "string" ||
      typeof username !== "string" ||
      !roomId.trim() ||
      !username.trim()
    ) {
      return;
    }

    const cleanRoom = roomId.trim();
    const cleanUsername = username.trim().slice(0, 20);

    socket.join(cleanRoom);

    onlineUsers.set(socket.id, {
      username: cleanUsername,
      team,
      roomId: cleanRoom,
    });

    io.to(cleanRoom).emit("online-users", {
      count: [...onlineUsers.values()].filter(
        (user) => user.roomId === cleanRoom
      ).length,
    });

    console.log(`${cleanUsername} joined ${cleanRoom}`);
  });

  // Broadcast a message to everyone in the room.
  socket.on("send-message", ({ roomId, username, message }) => {
    if (
      typeof roomId !== "string" ||
      typeof username !== "string" ||
      typeof message !== "string" ||
      !roomId.trim() ||
      !username.trim() ||
      !message.trim() ||
      message.length > 1000
    ) {
      return;
    }

    const user = onlineUsers.get(socket.id);

    if (!user || user.roomId !== roomId.trim()) {
      return;
    }

    const chatMessage = {
      id: `${socket.id}-${Date.now()}`,
      username: username.trim().slice(0, 20),
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    io.to(roomId.trim()).emit("receive-message", chatMessage);
  });

  // Typing indicator.
  socket.on("typing", ({ roomId, username }) => {
    const user = onlineUsers.get(socket.id);

    if (!user || user.roomId !== roomId) return;

    socket.to(roomId).emit("user-typing", {
      username: user.username,
    });
  });

  socket.on("stop-typing", ({ roomId }) => {
    const user = onlineUsers.get(socket.id);

    if (!user || user.roomId !== roomId) return;

    socket.to(roomId).emit("user-stop-typing", {
      username: user.username,
    });
  });

  // Disconnect.
  socket.on("disconnect", () => {
    const user = onlineUsers.get(socket.id);

    if (user) {
      onlineUsers.delete(socket.id);

      io.to(user.roomId).emit("online-users", {
        count: [...onlineUsers.values()].filter(
          (item) => item.roomId === user.roomId
        ).length,
      });

      console.log(`${user.username} disconnected`);
    }
  });
});

// ========================================
// GEMINI INITIALIZATION
// ========================================

let ai;

async function initializeAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from server/.env");
  }

  const { GoogleGenAI } = await import("@google/genai");

  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  console.log("Gemini AI initialized successfully.");
}

// ========================================
// GEMINI REQUEST WITH AUTOMATIC FALLBACK
// ========================================

async function generateWithRetry(prompt, jsonMode = false) {
  // Primary model followed by fallback models.
  const models = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
  ];

  let lastError;

  for (const model of models) {
    try {
      console.log(`Trying Gemini model: ${model}`);

      
const config = {
  temperature: 0.5,
  maxOutputTokens: jsonMode ? 1500 : 1200,
  ...(jsonMode
    ? { responseMimeType: "application/json" }
    : {}),
};


      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
      console.log("Gemini finish reason:",
  response.candidates?.[0]?.finishReason
);

console.log("Gemini token usage:",
  response.usageMetadata
);

console.log("Gemini raw response:",
  response.text
);

      const result = response.text;

      // An empty response should not stop the fallback sequence.
      if (typeof result !== "string" || !result.trim()) {
        const finishReasons =
          response.candidates?.map(
            (candidate) => candidate.finishReason
          ) || [];

        lastError = new Error(
          `Gemini model ${model} returned an empty response.`
        );

        console.error(
          `Gemini model ${model} returned an empty response. Finish reasons:`,
          finishReasons
        );

        console.log("Trying the next Gemini fallback...");
        continue;
      }

      console.log(
        `Gemini response generated successfully using ${model}`
      );

      return result.trim();

    } catch (error) {
      lastError = error;

      const errorText = String(error.message || error);

      const fallbackError =
        errorText.includes("503") ||
        errorText.includes("UNAVAILABLE") ||
        errorText.includes("429") ||
        errorText.includes("RESOURCE_EXHAUSTED") ||
        errorText.includes("500") ||
        errorText.includes("INTERNAL") ||
        errorText.includes("404") ||
        errorText.includes("NOT_FOUND");

      console.error(
        `Gemini model ${model} failed:`,
        errorText
      );

      // Authentication, permission and invalid-request errors
      // are not fixed by switching models.
      if (!fallbackError) {
        throw error;
      }

      console.log(
        `Switching to the next Gemini fallback after ${model}...`
      );
    }
  }

  console.error("All configured Gemini models failed.");

  throw (
    lastError ||
    new Error("All Gemini models are temporarily unavailable.")
  );
}


// ========================================
// CRICKET DATABASE API
// ========================================

const CRICKET_API_BASE = "https://api.cricketdatabase.com/v1";

// Common helper for Cricket Database requests.
async function cricketApiRequest(endpoint) {
  const apiKey = process.env.CDB_API_KEY;

  if (!apiKey) {
    throw new Error("CDB_API_KEY is missing from server/.env");
  }

  const response = await fetch(`${CRICKET_API_BASE}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const apiMessage =
      data?.error?.message ||
      data?.message ||
      data?.error ||
      `Cricket Database API request failed (${response.status})`;

    const error = new Error(String(apiMessage));
    error.status = response.status;
    throw error;
  }

  return data;
}

// Get live matches. state may be live, upcoming, finished, or all.
app.get("/api/cricket/live", async (req, res) => {
  try {
    const state = String(req.query.state || "live");

    if (!["live", "upcoming", "finished", "all"].includes(state)) {
      return res.status(400).json({
        error: "state must be live, upcoming, finished, or all",
      });
    }

    const data = await cricketApiRequest(
      `/live?state=${encodeURIComponent(state)}`
    );

    return res.json(data);
  } catch (error) {
    console.error("Cricket live matches error:", error.message);

    return res.status(error.status || 500).json({
      error: error.message || "Unable to fetch cricket matches",
    });
  }
});

// Get upcoming matches (next 24 hours per provider).
app.get("/api/cricket/upcoming", async (req, res) => {
  try {
    const data = await cricketApiRequest("/live?state=upcoming");
    return res.json(data);
  } catch (error) {
    console.error("Cricket upcoming matches error:", error.message);

    return res.status(error.status || 500).json({
      error: error.message || "Unable to fetch upcoming matches",
    });
  }
});

// Get one live match with scorecard, current batters, bowler, and match context.
app.get("/api/cricket/live/:matchId", async (req, res) => {
  try {
    const matchId = req.params.matchId;

    if (!/^[a-zA-Z0-9-]+$/.test(matchId)) {
      return res.status(400).json({ error: "Invalid match ID" });
    }

    const data = await cricketApiRequest(
      `/live/${encodeURIComponent(matchId)}`
    );

    return res.json(data);
  } catch (error) {
    console.error("Cricket match details error:", error.message);

    return res.status(error.status || 500).json({
      error: error.message || "Unable to fetch match details",
    });
  }
});

// Get live deliveries. Optional `after` cursor returns only new deliveries.
app.get("/api/cricket/live/:matchId/balls", async (req, res) => {
  try {
    const matchId = req.params.matchId;

    if (!/^[a-zA-Z0-9-]+$/.test(matchId)) {
      return res.status(400).json({ error: "Invalid match ID" });
    }

    const after = req.query.after;

    const endpoint =
      `/live/${encodeURIComponent(matchId)}/balls` +
      (after ? `?after=${encodeURIComponent(String(after))}` : "");

    const data = await cricketApiRequest(endpoint);
    return res.json(data);
  } catch (error) {
    console.error("Cricket live deliveries error:", error.message);

    return res.status(error.status || 500).json({
      error: error.message || "Unable to fetch live deliveries",
    });
  }
});

// ========================================
// HEALTH CHECK
// ========================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    service: "FanConnect AI Backend",
    gemini: ai ? "initialized" : "not initialized",
    realtimeChat: "enabled",
  });
});

// ========================================
// PULSE AI CHAT
// ========================================

app.post("/api/pulse/chat", async (req, res) => {
  const startedAt = Date.now();

  try {
    const { message, matchContext = {} } = req.body;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 1000
    ) {
      return res.status(400).json({
        error: "Enter a valid message.",
      });
    }

    // Preserve structured match data instead of converting it
    // into "[object Object]".
    let contextText;

    try {
      contextText =
        typeof matchContext === "string"
          ? matchContext
          : JSON.stringify(matchContext, null, 2);
    } catch {
      contextText = "Match context could not be read.";
    }

    contextText = String(
      contextText || "No match context available."
    ).slice(0, 5000);

    const prompt = `
You are PULSE AI, the cricket expert and community host inside
FanConnect AI, a real-time multiplayer cricket fan community.

You are NOT a generic chatbot. You are an intelligent cricket
companion who understands the match and actively participates
in conversations between fans.

========================
CURRENT MATCH CONTEXT
========================

${contextText}

========================
LATEST FAN MESSAGE
========================

${message.trim()}

========================
HOW YOU MUST RESPOND
========================

1. ANSWER THE ACTUAL QUESTION.
   Never respond with an unrelated score fragment or generic
   cricket commentary.

2. BE SPECIFIC.
   Use available match information such as:
   - Teams playing
   - Current score and wickets
   - Overs completed
   - Target and runs required
   - Required run rate
   - Recent deliveries
   - Previous messages in the conversation

3. MATCH PREDICTIONS:
   If asked who will win:
   - Clearly name the team you favour, if the available information
     supports a reasonable prediction.
   - Explain at least two reasons for your prediction.
   - Give a confidence level: Low, Medium or High.
   - Never present a prediction as a guaranteed result.

4. CRICKET ANALYSIS:
   If asked whether a score is good, explain it in the context of
   overs, wickets, target and match situation.
   If asked what a team needs, calculate it only when the required
   information is available.
   If asked about a player, answer using available information.
   Never invent player performances or statistics.

5. IF INFORMATION IS MISSING:
   Be transparent about what is missing.
   Ask one relevant follow-up question instead of guessing.
   Do not pretend that a score alone is enough to predict a winner.

6. COMMUNITY PERSONALITY:
   - Friendly, confident and energetic.
   - Sound like a knowledgeable cricket fan.
   - Use natural conversational language.
   - Use occasional cricket humour and emojis.
   - Engage both teams' supporters respectfully.
   - Remember the recent conversation when relevant.

7. RESPONSE LENGTH:
   - Normal questions: 2-4 useful sentences.
   - Detailed analysis questions: up to 5 sentences.
   - Simple greetings: short and friendly.
   - Avoid repeating the same information.

========================
EXAMPLES OF GOOD RESPONSES
========================

Question: "Who will win the match?"

Good response:
"I'd lean towards CSK right now! Their position looks stronger
because they have wickets in hand and the required run rate is
still manageable. My confidence is medium, though — the next
couple of overs could change everything. Any MI fans disagree? 🏏"

Question: "Is 156/4 a good score?"

Good response:
"156/4 could be a strong position, but it depends on how many
overs are left and what the target is. If this is around the
18th over, that's a competitive scoring rate. How many overs
have been completed?"

Question: "What does MI need?"

Good response:
"I need the target and current score to calculate exactly how
many runs MI need. Share those details and I'll work out the
required run rate too."

IMPORTANT:
The examples above are style examples, NOT actual match facts.
Only use information present in the supplied context.

Return only your conversational reply. Do not return JSON,
Markdown headings or internal reasoning.
`;

    const reply = await generateWithRetry(prompt);
    console.log("Pulse generated reply:", reply);

    console.log(
      `Pulse chat completed in ${Date.now() - startedAt}ms`
    );

    return res.json({ reply });

  } catch (error) {
    console.error("Pulse chat error:", error.message);

    console.log(
      `Pulse chat failed after ${Date.now() - startedAt}ms`
    );

    return res.status(503).json({
      error: "Pulse is temporarily unavailable. Please try again.",
    });
  }
});

// ========================================
// AI FAN REACTIONS + PULSE COMMENTARY
// ========================================

app.post("/api/pulse/reaction", async (req, res) => {
  const startedAt = Date.now();

  try {
    const {
      outcome,
      over,
      score,
      wicket,
      fanMemory = {},
    } = req.body;

    if (
      !outcome ||
      typeof outcome !== "string" ||
      outcome.length > 10
    ) {
      return res.status(400).json({
        error: "Invalid delivery information.",
      });
    }

    // Keep recent memories to reduce prompt size.
    const memory = {
      rahul: {
        personality: fanMemory?.rahul?.personality,
        observations:
          fanMemory?.rahul?.observations?.slice(-5) || [],
      },
      dev: {
        personality: fanMemory?.dev?.personality,
        runningJokes:
          fanMemory?.dev?.runningJokes?.slice(-5) || [],
      },
      aryan: {
        personality: fanMemory?.aryan?.personality,
        emotionalMoments:
          fanMemory?.aryan?.emotionalMoments?.slice(-5) || [],
        mood: fanMemory?.aryan?.mood,
      },
    };

    const prompt = `
You are the AI engine of FanConnect, a cricket fan community.

This is a SIMULATED demo match, NOT a real live match.

Use ONLY the delivery information supplied below.
Never invent match statistics or events.

CURRENT DELIVERY:
Outcome: ${outcome}
Over: ${String(over || "").slice(0, 20)}
Score context: ${String(score || "").slice(0, 100)}
Wicket: ${Boolean(wicket)}

FAN MEMORY:
${JSON.stringify(memory)}

GENERATE FOUR DISTINCT MESSAGES:

1. RAHUL — ANALYST
- Tactical, thoughtful and statistics-minded.
- Use his previous observations.
- Explain the tactical significance of the delivery.

2. DEV — ENTERTAINER
- Funny, playful and witty.
- Use his previous running jokes.
- Make the reaction entertaining.

3. ARYAN — PASSIONATE
- Emotional, energetic and loyal.
- Use his previous emotional moments and current mood.
- React like a deeply invested supporter.

4. PULSE AI — COMMUNITY HOST
- Act as the official AI companion of this fan community.
- React to the actual delivery.
- Explain briefly how the delivery changes the pressure or momentum.
- Make the conversation engaging.
- Sound different from the three simulated fans.
- Encourage fans to share their opinions.
- Do not repeat their reactions.

RESPONSE RULES:
- Each message should be 1-2 short sentences.
- Every message must be relevant to this exact delivery.
- Do not invent score changes or match events.
- Avoid generic messages.
- Keep the four voices distinct.

RETURN ONLY VALID JSON:

{
  "reactions": [
    {
      "personality": "Analyst",
      "message": "Rahul's reaction"
    },
    {
      "personality": "Entertainer",
      "message": "Dev's reaction"
    },
    {
      "personality": "Passionate",
      "message": "Aryan's reaction"
    }
  ],
  "pulseMessage": "Pulse AI's own delivery commentary"
}
`;

    const result = await generateWithRetry(prompt, true);

    // Remove accidental Markdown code fences.
    const cleanedResult = result
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleanedResult);

    const expectedPersonalities = [
      "Analyst",
      "Entertainer",
      "Passionate",
    ];

    if (
      !parsed ||
      !Array.isArray(parsed.reactions) ||
      !expectedPersonalities.every((personality) =>
        parsed.reactions.some(
          (reaction) =>
            reaction.personality === personality &&
            typeof reaction.message === "string" &&
            reaction.message.trim().length > 0
        )
      )
    ) {
      throw new Error("Invalid Gemini reaction format.");
    }

    if (
      typeof parsed.pulseMessage !== "string" ||
      !parsed.pulseMessage.trim()
    ) {
      throw new Error("Pulse commentary is missing.");
    }

    const reactions = expectedPersonalities.map((personality) =>
      parsed.reactions.find(
        (reaction) => reaction.personality === personality
      )
    );

    console.log(
      `Fan reactions and Pulse commentary completed in ${
        Date.now() - startedAt
      }ms`
    );

    return res.json({
      reactions,
      pulseMessage: parsed.pulseMessage.trim(),
    });

  } catch (error) {
    console.error("Pulse reaction error:", error.message);

    console.log(
      `Reaction request failed after ${Date.now() - startedAt}ms`
    );

    return res.status(503).json({
      error: "AI fan reactions are temporarily unavailable.",
    });
  }
});

// ========================================
// START SERVER
// ========================================

initializeAI()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(
        `FanConnect backend running at http://localhost:${PORT}`
      );

      console.log("Socket.IO real-time chat is ready.");
      console.log("Pulse AI chat and delivery commentary are ready.");
    });
  })
  .catch((error) => {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  });
