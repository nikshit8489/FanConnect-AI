
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  Send,
  Users,
  Trophy,
  MessageCircle,
  Target,
  Sparkles,
  Lock,
  CheckCircle2,
  Zap,
  Radio,
  RotateCcw,
  ArrowRight,
} from "lucide-react";

import "./TribeRoom.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const DEFAULT_ROOM_ID = "mi-csk-tribe";

// Both users in an accepted invitation use the same invitation room ID.
// The newest accepted invitation is selected if a user has multiple connections.
function getAcceptedRoomId(currentUserId) {
  if (!currentUserId) return DEFAULT_ROOM_ID;

  try {
    const invitations = JSON.parse(
      localStorage.getItem("fanconnectInvitations") || "[]"
    );

    if (!Array.isArray(invitations)) return DEFAULT_ROOM_ID;

    const acceptedInvitation = invitations
      .filter(
        (invitation) =>
          invitation?.status === "accepted" &&
          (invitation.fromUserId === currentUserId ||
            invitation.toUserId === currentUserId) &&
          typeof invitation.roomId === "string" &&
          invitation.roomId.trim()
      )
      .sort(
        (a, b) =>
          new Date(b.acceptedAt || b.createdAt || 0).getTime() -
          new Date(a.acceptedAt || a.createdAt || 0).getTime()
      )[0];

    return acceptedInvitation?.roomId || DEFAULT_ROOM_ID;
  } catch (error) {
    console.error("Could not read accepted TribeMatch invitations:", error);
    return DEFAULT_ROOM_ID;
  }
}

// The signed-in account occupies the original Nikshit player slot.
// Keeping this ID preserves the existing scoring and prediction logic.
const demoPlayers = [
  {
    id: "rahul",
    name: "Rahul",
    personality: "The Analyst",
    avatar: "🧠",
    team: "Mumbai Indians",
  },
  {
    id: "dev",
    name: "Dev",
    personality: "The Entertainer",
    avatar: "😂",
    team: "Mumbai Indians",
  },
  {
    id: "aryan",
    name: "Aryan",
    personality: "The Passionate",
    avatar: "🔥",
    team: "Chennai Super Kings",
  },
];

const personalityDetails = {
  analyst: { name: "The Analyst", avatar: "🧠" },
  passionate: { name: "The Passionate", avatar: "🔥" },
  entertainer: { name: "The Entertainer", avatar: "😂" },
  loyalist: { name: "The Loyalist", avatar: "💙" },
};

const predictionOptions = [
  { value: "0", label: "Dot ball" },
  { value: "1", label: "1 run" },
  { value: "2", label: "2 runs" },
  { value: "3", label: "3 runs" },
  { value: "4", label: "Four" },
  { value: "6", label: "Six" },
  { value: "W", label: "Wicket" },
  { value: "EX", label: "Extras" },
];

const demoOutcomes = ["4", "1", "W", "0", "6", "2", "4", "0", "1", "W", "6", "1"];

const botPredictions = {
  rahul: ["4", "1", "1", "0", "6", "2"],
  dev: ["6", "4", "W", "0", "4", "1"],
  aryan: ["4", "2", "W", "1", "6", "2"],
};

const initialFanMemory = {
  rahul: {
    observations: [],
    personality: "Analytical, tactical and thoughtful",
  },
  dev: {
    runningJokes: [],
    personality: "Funny, playful and loves cricket banter",
  },
  aryan: {
    emotionalMoments: [],
    mood: "Excited",
    personality: "Passionate, emotional and loyal",
  },
};

const initialMessages = [
  {
    id: 1,
    sender: "Rahul",
    avatar: "🧠",
    message: "That last over completely changed the momentum!",
    time: "14:32",
  },
  {
    id: 2,
    sender: "Dev",
    avatar: "😂",
    message: "My prediction game is ON today 😂",
    time: "14:33",
  },
  {
    id: 3,
    sender: "Aryan",
    avatar: "🔥",
    message: "Come on! Need a six this over!",
    time: "14:34",
  },
];

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TribeRoom({ currentUser }) {
  // Use the shared room created by the newest accepted TribeMatch invitation.
  // Keep the original demo room as a fallback to preserve existing behavior.
  const activeRoomId = getAcceptedRoomId(currentUser?.id);

  // Read the signed-in account's Fan DNA.
  const savedPersonality =
    currentUser?.fanDNA?.type || "entertainer";

  const currentPersonality =
    personalityDetails[savedPersonality] ||
    personalityDetails.entertainer;

  const accountName = currentUser?.name || "Nikshit";
  const accountTeam = currentUser?.team || "Mumbai Indians";

  // Preserve the original player IDs for all existing features.
  const players = [
    {
      id: "nikshit",
      name: accountName,
      personality: currentPersonality.name,
      avatar: currentPersonality.avatar,
      team: accountTeam,
    },
    ...demoPlayers,
  ];

  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const chatMessagesRef = useRef(null);

  // Real-time multiplayer chat state.
  const socketRef = useRef(null);
  const welcomedUsernameRef = useRef("");

  const [username, setUsername] = useState(
    () =>
      currentUser?.name ||
      localStorage.getItem("fanconnect-username") ||
      "Nikshit"
  );

  const [onlineUsers, setOnlineUsers] = useState(0);
  const [typingUser, setTypingUser] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);

  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [lockedPredictions, setLockedPredictions] = useState(null);
  const [lastOutcome, setLastOutcome] = useState(null);
  const [ballNumber, setBallNumber] = useState(0);

  const [scores, setScores] = useState({
    nikshit: 0,
    rahul: 0,
    dev: 0,
    aryan: 0,
  });

  const [overHits, setOverHits] = useState({
    nikshit: 0,
    rahul: 0,
    dev: 0,
    aryan: 0,
  });

  const [history, setHistory] = useState([]);
  const [bonusWinners, setBonusWinners] = useState([]);

  const [isGeneratingReactions, setIsGeneratingReactions] = useState(false);
  const [isPulseLoading, setIsPulseLoading] = useState(false);

  // Restore fan memory from the browser.
  const [fanMemory, setFanMemory] = useState(() => {
    try {
      const saved = localStorage.getItem("fanconnect-memory");
      return saved
        ? { ...initialFanMemory, ...JSON.parse(saved) }
        : initialFanMemory;
    } catch {
      return initialFanMemory;
    }
  });

  // Keep chat pinned to the newest message after React renders it.
  useEffect(() => {
    const chatContainer = chatMessagesRef.current;
    if (!chatContainer) return;

    requestAnimationFrame(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
  }, [messages, typingUser, isPulseLoading, isGeneratingReactions]);

  // Keep the chat identity synchronized with mock authentication.
  useEffect(() => {
    if (!currentUser) return;

    const nextName = currentUser.name || "Fan";

    setUsername(nextName);
    localStorage.setItem("fanconnect-username", nextName);
  }, [currentUser?.id, currentUser?.name]);

  // Automatically save memory whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem("fanconnect-memory", JSON.stringify(fanMemory));
    } catch (error) {
      console.warn("Could not save fan memory:", error);
    }
  }, [fanMemory]);

  // Connect this browser to the shared Tribe Room.
  useEffect(() => {
    const cleanUsername = username.trim();
    if (!cleanUsername) return undefined;

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);

      socket.emit("join-room", {
        roomId: activeRoomId,
        username: cleanUsername,
        team: accountTeam,
      });

      // Welcome this username once, without repeating on reconnect.
      if (welcomedUsernameRef.current !== cleanUsername) {
        welcomedUsernameRef.current = cleanUsername;

        setMessages((previous) => [
          ...previous,
          {
            id: `welcome-${socket.id}-${cleanUsername}`,
            sender: "Pulse AI",
            avatar: "🤖",
            message: `Hey ${cleanUsername}! 👋 Welcome to your Tribe Room. I'm Pulse, your cricket companion. Chat with fellow fans, make predictions and mention @ai pulse whenever you want to discuss cricket. Let's go! 🏏`,
            time: getCurrentTime(),
          },
        ]);
      }
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      setOnlineUsers(0);
      setTypingUser("");
    });

    socket.on("receive-message", (data) => {
      setMessages((previous) => [
        ...previous,
        {
          id: data.id,
          sender: data.username,
          avatar: data.username === "Pulse AI" ? "🤖" : "👤",
          message: data.message,
          time: new Date(data.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    });

    socket.on("online-users", (data) => {
      setOnlineUsers(data.count);
    });

    socket.on("user-typing", (data) => {
      if (data.username !== cleanUsername) {
        setTypingUser(data.username);
      }
    });

    socket.on("user-stop-typing", () => {
      setTypingUser("");
    });

    return () => {
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [username, accountTeam, activeRoomId]);

  const over = Math.floor(ballNumber / 6);
  const ball = (ballNumber % 6) + 1;
  const currentOver = `${over}.${ball}`;

  // Add a local system or AI message.
  const addMessage = (sender, avatar, message) => {
    setMessages((previous) => [
      ...previous,
      {
        id: Date.now() + Math.random(),
        sender,
        avatar,
        message,
        time: getCurrentTime(),
      },
    ]);
  };

  // Send messages to the tribe. Mention @ai pulse to invite Pulse.
  const sendMessage = async (event) => {
    event.preventDefault();

    const userText = messageInput.trim();
    const activeUsername = username.trim();

    if (!userText || !activeUsername) return;

    if (!socketRef.current?.connected) {
      addMessage(
        "SYSTEM",
        "⚠️",
        "Chat is reconnecting. Please try again in a moment."
      );
      return;
    }

    // Broadcast the human message. The backend emits receive-message
    // to everyone in this Socket.IO room, including the sender.
    socketRef.current.emit("send-message", {
      roomId: activeRoomId,
      username: activeUsername,
      message: userText,
    });

    socketRef.current.emit("stop-typing", {
      roomId: activeRoomId,
      username: activeUsername,
    });

    setMessageInput("");

    // Ordinary messages remain human-to-human.
    // Pulse responds only when explicitly mentioned.
    if (!/@ai\s*pulse\b/i.test(userText)) return;

    setIsPulseLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/pulse/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message:
            userText.replace(/@ai\s*pulse\b/gi, "").trim() ||
            "Join our cricket discussion!",
          matchContext: `
You are Pulse, an active member of this multiplayer cricket community.
The user ${activeUsername} has directly mentioned you.

Match: MI vs CSK sample match simulation.
Displayed sample score: 156/4 after 15 overs.
This is demo data, not a live match.

Recent conversation:
${messages
  .slice(-10)
  .map((msg) => `${msg.sender}: ${msg.message}`)
  .join("\n")}

Fan personality memory:
${JSON.stringify(fanMemory)}

The signed-in user has the Fan DNA personality: ${currentPersonality.name}.

Respond directly to ${activeUsername}. Be friendly, cricket-aware,
energetic and concise. Answer the actual question. Never invent live
match information.
          `,
        }),
      });

      if (!response.ok) {
        throw new Error(`Pulse API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.reply) {
        throw new Error("Pulse returned an empty response.");
      }

      // Broadcast Pulse's response to every connected user.
      if (socketRef.current?.connected) {
        socketRef.current.emit("send-message", {
          roomId: activeRoomId,
          username: "Pulse AI",
          message: data.reply,
        });
      }
    } catch (error) {
      console.error("Pulse chat error:", error);

      if (socketRef.current?.connected) {
        socketRef.current.emit("send-message", {
          roomId: activeRoomId,
          username: "Pulse AI",
          message:
            "I'm having trouble responding right now. Please mention me again in a moment! 🏏",
        });
      }
    } finally {
      setIsPulseLoading(false);
    }
  };

  // Instant fan reactions followed by Gemini enhancement.
  const generateAIReactions = async (outcome, deliveryOver) => {
    setIsGeneratingReactions(true);

    const instantReactions = {
      W: {
        Rahul: "That wicket changes the equation! The batting side needs to rethink its approach. 🧠",
        Dev: "BROOO! Someone just booked an early ticket back to the pavilion! 😂",
        Aryan: "NOOO! Not another wicket! Come on guys, fight back! 🔥",
      },
      4: {
        Rahul: "Good placement! The batter found the gap perfectly.",
        Dev: "BOUNDARY ALERT! The ball has officially left the chat! 😂",
        Aryan: "FOURRR! That's what I'm talking about! 🔥",
      },
      6: {
        Rahul: "Excellent power and timing. That delivery was punished.",
        Dev: "SOMEONE CHECK THE BALL'S PASSPORT! IT JUST LEFT THE STADIUM! 😂",
        Aryan: "SIX!!! WHAT A SHOT! LET'S GOOOO! 🔥",
      },
      0: {
        Rahul: "A dot ball. Good pressure from the bowler.",
        Dev: "The ball went sightseeing and came back without a single run. 😂",
        Aryan: "Come on! We need runs! Don't waste deliveries! 🔥",
      },
      default: {
        Rahul: `A ${outcome}-run delivery. Every run matters at this stage.`,
        Dev: "Nice little contribution! The scoreboard is moving! 😂",
        Aryan: "Come on! Keep pushing! Every run counts! 🔥",
      },
    };

    const reactions =
      instantReactions[outcome] || instantReactions.default;

    const reactionMembers = {
      Rahul: { avatar: "🧠" },
      Dev: { avatar: "😂" },
      Aryan: { avatar: "🔥" },
    };

    const reactionIds = {};

    const immediateMessages = Object.entries(reactions).map(
      ([name, message], index) => {
        const id = `instant-${Date.now()}-${index}`;
        reactionIds[name] = id;

        return {
          id,
          sender: name,
          avatar: reactionMembers[name].avatar,
          message,
          time: getCurrentTime(),
        };
      }
    );

    setMessages((previous) => [...previous, ...immediateMessages]);

    // Gemini generates the three fan reactions and Pulse commentary
    // together in one request.
    try {
      const response = await fetch(`${API_URL}/api/pulse/reaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outcome,
          over: deliveryOver,
          score: "156/4 (15.0 overs) — sample match simulation",
          wicket: outcome === "W",
          personalities: ["Analyst", "Entertainer", "Passionate"],
          fanMemory,
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini reaction request failed: ${response.status}`);
      }

      const data = await response.json();

      // Pulse automatically comments on the latest delivery.
      if (
        typeof data.pulseMessage === "string" &&
        data.pulseMessage.trim() &&
        socketRef.current?.connected
      ) {
        socketRef.current.emit("send-message", {
          roomId: activeRoomId,
          username: "Pulse AI",
          message: data.pulseMessage.trim(),
        });
      }

      if (!Array.isArray(data.reactions)) {
        throw new Error("Invalid Gemini reaction response.");
      }

      const nameByPersonality = {
        Analyst: "Rahul",
        Entertainer: "Dev",
        Passionate: "Aryan",
      };

      const updatedReactions = {};

      data.reactions.forEach((reaction) => {
        const name = nameByPersonality[reaction.personality];

        if (
          name &&
          typeof reaction.message === "string" &&
          reaction.message.trim()
        ) {
          updatedReactions[name] = reaction.message.trim();
        }
      });

      setMessages((previous) =>
        previous.map((message) => {
          const fanName = Object.keys(reactionIds).find(
            (name) => reactionIds[name] === message.id
          );

          if (fanName && updatedReactions[fanName]) {
            return {
              ...message,
              message: updatedReactions[fanName],
            };
          }

          return message;
        })
      );
    } catch (error) {
      console.warn(
        "Gemini background reactions unavailable; keeping instant reactions:",
        error.message
      );
    } finally {
      setIsGeneratingReactions(false);
    }
  };

  // Every member locks a prediction for the upcoming delivery.
  const lockPrediction = () => {
    if (!selectedPrediction || lockedPredictions) return;

    const predictions = {
      nikshit: selectedPrediction,
      rahul: botPredictions.rahul[ballNumber % 6],
      dev: botPredictions.dev[ballNumber % 6],
      aryan: botPredictions.aryan[ballNumber % 6],
    };

    setLockedPredictions(predictions);
    setLastOutcome(null);
    setBonusWinners([]);

    addMessage(
      "SYSTEM",
      "🔒",
      "Predictions locked! Waiting for the delivery..."
    );
  };

  // Resolve a simulated delivery and award points.
  const resolveDelivery = () => {
    if (!lockedPredictions) return;

    const outcome = demoOutcomes[ballNumber % demoOutcomes.length];

    const memoryEvent = {
      over: currentOver,
      outcome,
      description:
        outcome === "W"
          ? `A wicket occurred at ${currentOver}.`
          : outcome === "4"
          ? `A boundary was scored at ${currentOver}.`
          : outcome === "6"
          ? `A six was scored at ${currentOver}.`
          : outcome === "0"
          ? `A dot ball occurred at ${currentOver}.`
          : `${outcome} runs were scored at ${currentOver}.`,
    };

    setFanMemory((previous) => ({
      ...previous,
      rahul: {
        ...previous.rahul,
        observations: [
          ...previous.rahul.observations,
          memoryEvent,
        ].slice(-12),
      },
      dev: {
        ...previous.dev,
        runningJokes: [
          ...previous.dev.runningJokes,
          outcome === "W"
            ? "Another batter has entered the pavilion!"
            : outcome === "6"
            ? "The ball has left the stadium!"
            : outcome === "4"
            ? "Boundary alert!"
            : "Waiting for something dramatic!",
        ].slice(-8),
      },
      aryan: {
        ...previous.aryan,
        emotionalMoments: [
          ...previous.aryan.emotionalMoments,
          memoryEvent,
        ].slice(-12),
        mood:
          outcome === "W"
            ? "Disappointed and emotional"
            : outcome === "6" || outcome === "4"
            ? "Excited and energetic"
            : "Hopeful and tense",
      },
    }));

    const nextHits = { ...overHits };
    const roundPoints = {};

    players.forEach((player) => {
      const correct = lockedPredictions[player.id] === outcome;
      roundPoints[player.id] = correct ? 10 : 0;

      if (correct) {
        nextHits[player.id] += 1;
      }
    });

    const isEndOfOver = ballNumber % 6 === 5;
    let winners = [];

    if (isEndOfOver) {
      const highest = Math.max(...Object.values(nextHits));

      if (highest > 0) {
        winners = Object.keys(nextHits).filter(
          (id) => nextHits[id] === highest
        );

        winners.forEach((id) => {
          roundPoints[id] += 20;
        });
      }
    }

    setScores((previous) => {
      const updated = { ...previous };

      Object.keys(roundPoints).forEach((id) => {
        updated[id] += roundPoints[id];
      });

      return updated;
    });

    setOverHits(
      isEndOfOver
        ? {
            nikshit: 0,
            rahul: 0,
            dev: 0,
            aryan: 0,
          }
        : nextHits
    );

    setLastOutcome(outcome);
    setBonusWinners(winners);

    setHistory((previous) => [
      {
        over: currentOver,
        outcome,
        predictions: lockedPredictions,
        points: roundPoints,
        bonusWinners: winners,
      },
      ...previous,
    ]);

    const outcomeLabel = predictionOptions.find(
      (option) => option.value === outcome
    )?.label;

    addMessage(
      "SYSTEM",
      "🏏",
      `Ball ${currentOver}: ${outcomeLabel}! ${
        winners.length
          ? `${winners
              .map((id) => players.find((p) => p.id === id)?.name)
              .join(", ")} won the over bonus!`
          : "Points have been updated."
      }`
    );

    generateAIReactions(outcome, currentOver);
  };

  const nextBall = () => {
    setBallNumber((previous) => previous + 1);
    setSelectedPrediction(null);
    setLockedPredictions(null);
    setLastOutcome(null);
    setBonusWinners([]);
  };

  const resetMatch = () => {
    setBallNumber(0);

    setScores({
      nikshit: 0,
      rahul: 0,
      dev: 0,
      aryan: 0,
    });

    setOverHits({
      nikshit: 0,
      rahul: 0,
      dev: 0,
      aryan: 0,
    });

    setSelectedPrediction(null);
    setLockedPredictions(null);
    setLastOutcome(null);
    setHistory([]);
    setBonusWinners([]);
    setMessages(initialMessages);
    setIsGeneratingReactions(false);
  };

  // Gemini-powered Pulse AI discussion starter.
  const startDiscussion = async () => {
    if (isPulseLoading) return;

    setIsPulseLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/pulse/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message:
            "Start an interesting cricket discussion in our fan tribe. Ask one engaging question about the match, tactics, or players. Make it fun and encourage different opinions.",
          matchContext: `
MI vs CSK sample match simulation.
Displayed sample score: 156/4 after 15.0 overs.
This is demo data, not a live match.

Signed-in fan: ${username}
Fan DNA personality: ${currentPersonality.name}
Favourite team: ${accountTeam}

Fan personality memory:
${JSON.stringify(fanMemory)}

Use the remembered personalities and previous moments to create a
discussion that feels relevant to this tribe. Do not invent live match facts.
          `,
        }),
      });

      if (!response.ok) {
        throw new Error("Pulse AI could not respond.");
      }

      const data = await response.json();

      if (!data.reply) {
        throw new Error("Pulse returned an empty response.");
      }

      // Broadcast the discussion starter to every connected fan.
      if (socketRef.current?.connected) {
        socketRef.current.emit("send-message", {
          roomId: activeRoomId,
          username: "Pulse AI",
          message: data.reply,
        });
      }
    } catch (error) {
      console.error("Pulse AI error:", error);

      if (socketRef.current?.connected) {
        socketRef.current.emit("send-message", {
          roomId: activeRoomId,
          username: "Pulse AI",
          message:
            "I'm having trouble connecting right now. Make sure the backend is running and try again!",
        });
      }
    } finally {
      setIsPulseLoading(false);
    }
  };

  const leaderboard = [...players].sort(
    (a, b) => scores[b.id] - scores[a.id]
  );

  return (
    <section className="room-section" id="tribe-room">
      {/* ROOM HEADER */}
      <div className="room-header">
        <div>
          <span className="room-eyebrow">
            <Radio size={14} /> FANCONNECT LIVE EXPERIENCE
          </span>

          <h2>
            The Meme <span>Pavilion 😂</span>
          </h2>

          <p>
            Your cricket tribe. Your predictions. Your leaderboard.
          </p>
        </div>

        <div className="room-live-status">
          <span className="room-live-dot"></span>
          DEMO MATCH
        </div>
      </div>

      {/* MATCH SCORE */}
      <div className="match-banner">
        <div className="match-teams">
          <div className="match-team">
            <span className="team-icon">💙</span>
            <div>
              <strong>MI</strong>
              <span>Mumbai Indians</span>
            </div>
          </div>

          <div className="match-score">
            <strong>156/4</strong>
            <span>15.0 Overs</span>
          </div>

          <div className="match-team team-right">
            <div>
              <strong>CSK</strong>
              <span>Chennai Super Kings</span>
            </div>
            <span className="team-icon">💛</span>
          </div>
        </div>

        <div className="match-footer">
          <span>MI vs CSK · Sample match simulation</span>
          <span>Target: 187</span>
        </div>
      </div>

      {/* ROOM MEMBERS */}
      <div className="room-members">
        <div>
          <Users size={17} />
          <strong>Your Tribe</strong>
          <span>{onlineUsers} online</span>
        </div>

        <div className="member-avatars">
          {players.map((player) => (
            <div
              key={player.id}
              className="member-avatar"
              title={`${player.name} · ${player.personality}`}
            >
              {player.avatar}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN ROOM GRID */}
      <div className="room-grid">
        <div className="room-main">
          {/* CHAT */}
          <div className="room-panel chat-panel">
            <div className="panel-heading">
              <div>
                <MessageCircle size={19} />
                <strong>Tribe Chat</strong>
              </div>

              <span>
                {socketConnected ? "🟢 Connected" : "🔴 Connecting..."}
                {" · "}
                {onlineUsers} online
              </span>
            </div>

            <div className="chat-identity">
              <input
                type="text"
                placeholder="Your signed-in fan username"
                value={username}
                maxLength={20}
                readOnly={!!currentUser?.id}
                onChange={(event) => {
                  const value = event.target.value;
                  setUsername(value);
                  localStorage.setItem("fanconnect-username", value);
                }}
              />

              <span>
                {socketConnected
                  ? `You're in the tribe as ${username}`
                  : "Connecting to tribe..."}
              </span>
            </div>

            <div
              className="chat-messages"
              ref={chatMessagesRef}
              style={{
                maxHeight: "420px",
                overflowY: "auto",
                overscrollBehavior: "contain",
                scrollBehavior: "smooth",
              }}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message ${
                    message.sender === username ? "my-message" : ""
                  } ${
                    message.sender === "SYSTEM" ? "system-message" : ""
                  }`}
                >
                  <div className="chat-avatar">{message.avatar}</div>

                  <div className="message-content">
                    <div className="message-meta">
                      <strong>{message.sender}</strong>
                      <span>{message.time}</span>
                    </div>

                    <p>{message.message}</p>
                  </div>
                </div>
              ))}

              {typingUser && (
                <p className="typing-indicator">
                  {typingUser} is typing...
                </p>
              )}

              {isGeneratingReactions && (
                <div className="chat-message">
                  <div className="chat-avatar">🤖</div>
                  <div className="message-content">
                    <div className="message-meta">
                      <strong>Pulse AI</strong>
                      <span>NOW</span>
                    </div>
                    <p>Gemini is adding its analysis in the background... ✨</p>
                  </div>
                </div>
              )}

              {isPulseLoading && (
                <div className="chat-message">
                  <div className="chat-avatar">🤖</div>
                  <div className="message-content">
                    <div className="message-meta">
                      <strong>Pulse AI</strong>
                      <span>NOW</span>
                    </div>
                    <p>Pulse is thinking... 🏏</p>
                  </div>
                </div>
              )}
            </div>

            <form className="chat-input" onSubmit={sendMessage}>
              <input
                type="text"
                placeholder="Message your tribe... or mention @ai pulse"
                value={messageInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setMessageInput(value);

                  if (value.trim() && socketRef.current?.connected) {
                    socketRef.current.emit("typing", {
                      roomId: activeRoomId,
                      username,
                    });
                  } else if (socketRef.current?.connected) {
                    socketRef.current.emit("stop-typing", {
                      roomId: activeRoomId,
                      username,
                    });
                  }
                }}
                maxLength={300}
              />

              <button
                type="submit"
                disabled={!messageInput.trim() || !username.trim()}
              >
                <Send size={17} />
              </button>
            </form>
          </div>

          {/* BALL PREDICTOR */}
          <div className="room-panel predictor-panel">
            <div className="panel-heading">
              <div>
                <Target size={20} />
                <strong>Ball-by-Ball Predictor</strong>
              </div>

              <span className="ball-number">{currentOver} OVER</span>
            </div>

            <div className="predictor-info">
              <div>
                <span>UPCOMING DELIVERY</span>
                <h3>What happens next?</h3>
                <p>Choose your prediction before the ball is bowled.</p>
              </div>

              <div className="predictor-ball">🏏</div>
            </div>

            <div className="prediction-options">
              {predictionOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  disabled={!!lockedPredictions}
                  className={`prediction-option ${
                    selectedPrediction === option.value
                      ? "prediction-selected"
                      : ""
                  }`}
                  onClick={() => setSelectedPrediction(option.value)}
                >
                  <strong>{option.value}</strong>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>

            {lockedPredictions && (
              <div className="locked-info">
                <Lock size={15} />
                Predictions are locked for delivery {currentOver}.
              </div>
            )}

            {lastOutcome && (
              <div className="delivery-result">
                <div>
                  <span>DELIVERY RESULT</span>
                  <h3>
                    {
                      predictionOptions.find(
                        (option) => option.value === lastOutcome
                      )?.label
                    }
                  </h3>
                </div>

                <div className="result-ball">{lastOutcome}</div>
              </div>
            )}

            {lockedPredictions && !lastOutcome && (
              <div className="locked-predictions">
                <strong>All four predictions are locked</strong>

                {players.map((player) => (
                  <div key={player.id}>
                    <span>
                      {player.avatar} {player.name}
                    </span>
                    <strong>{lockedPredictions[player.id]}</strong>
                  </div>
                ))}
              </div>
            )}

            {bonusWinners.length > 0 && (
              <div className="bonus-announcement">
                <Trophy size={17} />
                {bonusWinners
                  .map((id) => players.find((p) => p.id === id)?.name)
                  .join(", ")}{" "}
                earned the +20 over bonus!
              </div>
            )}

            {!lockedPredictions ? (
              <button
                className="predict-button"
                onClick={lockPrediction}
                disabled={!selectedPrediction}
              >
                <Lock size={16} />
                Lock my prediction
              </button>
            ) : !lastOutcome ? (
              <button className="predict-button" onClick={resolveDelivery}>
                <Zap size={17} />
                Reveal demo delivery
              </button>
            ) : (
              <button className="predict-button" onClick={nextBall}>
                Next delivery <Sparkles size={16} />
              </button>
            )}

            <p className="scoring-note">
              <CheckCircle2 size={13} />
              Correct prediction +10 points · Over winner +20 bonus
            </p>
          </div>

          {/* PREDICTION HISTORY */}
          <div className="room-panel history-panel">
            <div className="panel-heading">
              <div>
                <Target size={18} />
                <strong>Prediction History</strong>
              </div>
              <span>{history.length} deliveries</span>
            </div>

            {history.length === 0 ? (
              <p className="empty-history">
                Your prediction history will appear here after the first
                delivery.
              </p>
            ) : (
              <div className="history-list">
                {history.map((item, index) => (
                  <div
                    className="history-row"
                    key={`${item.over}-${index}`}
                  >
                    <strong>{item.over}</strong>
                    <span>Actual: {item.outcome}</span>

                    <span>
                      You predicted: {item.predictions.nikshit}
                    </span>

                    <strong
                      className={
                        item.points.nikshit > 0 ? "earned-points" : ""
                      }
                    >
                      +{item.points.nikshit} pts
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: LEADERBOARD */}
        <aside className="room-sidebar">
          <div className="room-panel leaderboard-panel">
            <div className="panel-heading">
              <div>
                <Trophy size={19} />
                <strong>Leaderboard</strong>
              </div>

              <span>LIVE</span>
            </div>

            <div className="leaderboard-intro">
              <h3>Who's leading?</h3>
              <p>Earn points with every correct delivery prediction.</p>
            </div>

            {leaderboard.map((player, index) => (
              <div className="leaderboard-player" key={player.id}>
                <div className="rank-number">
                  {index === 0
                    ? "🥇"
                    : index === 1
                    ? "🥈"
                    : index === 2
                    ? "🥉"
                    : "4"}
                </div>

                <div className="leaderboard-avatar">{player.avatar}</div>

                <div className="leaderboard-info">
                  <strong>
                    {player.name}
                    {player.id === "nikshit" && " (You)"}
                  </strong>

                  <span>{player.personality}</span>
                </div>

                <div className="leaderboard-points">
                  {scores[player.id]}
                  <span>PTS</span>
                </div>
              </div>
            ))}

            <div className="bonus-card">
              <Trophy size={23} />

              <div>
                <strong>Over Winner Bonus</strong>
                <span>Top predictor earns +20 points</span>
              </div>
            </div>

            <button className="reset-button" onClick={resetMatch}>
              <RotateCcw size={14} /> Reset demo match
            </button>
          </div>

          {/* GEMINI-POWERED PULSE AI */}
          <div className="room-panel ai-panel">
            <div className="ai-heading">
              <Sparkles size={18} />
              <strong>Pulse AI</strong>
            </div>

            <h3>Keep the conversation alive!</h3>

            <p>
              Mention @ai pulse in the chat whenever you want to talk cricket.
              Pulse also reacts automatically after every delivery.
            </p>

            <button
              onClick={startDiscussion}
              disabled={isPulseLoading}
            >
              {isPulseLoading ? (
                <>
                  <Sparkles size={15} /> Pulse is thinking...
                </>
              ) : (
                <>
                  Start discussion <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      <div className="room-disclaimer">
        <Sparkles size={15} />
        Prototype simulation: match outcomes and AI fan profiles are sample data.
        Tribe chat uses a real-time Socket.IO connection; messages are not yet
        saved permanently. No live match feed is connected.
      </div>
    </section>
  );
}

export default TribeRoom;
