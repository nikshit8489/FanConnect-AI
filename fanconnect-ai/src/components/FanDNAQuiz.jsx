
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Flame,
  Laugh,
  Heart,
  Sparkles,
  RotateCcw,
} from "lucide-react";

import "./FanDNAQuiz.css";

const questions = [
  {
    question: "Your team loses a wicket in a crucial over. What's your reaction?",
    options: [
      { text: "Analyse what went wrong", type: "analyst", icon: Brain },
      { text: "Feel the heartbreak", type: "passionate", icon: Flame },
      { text: "Make a meme about it", type: "entertainer", icon: Laugh },
      { text: "Keep supporting my team", type: "loyalist", icon: Heart },
    ],
  },
  {
    question: "What do you enjoy most about watching cricket?",
    options: [
      { text: "Tactics, statistics and strategy", type: "analyst", icon: Brain },
      { text: "The thrill of every delivery", type: "passionate", icon: Flame },
      { text: "Fun conversations and banter", type: "entertainer", icon: Laugh },
      { text: "Supporting my favourite team", type: "loyalist", icon: Heart },
    ],
  },
  {
    question: "Your friend supports your rival team. What happens?",
    options: [
      { text: "I debate using match statistics", type: "analyst", icon: Brain },
      { text: "Every ball becomes personal!", type: "passionate", icon: Flame },
      { text: "Friendly trolling begins", type: "entertainer", icon: Laugh },
      { text: "My team loyalty never changes", type: "loyalist", icon: Heart },
    ],
  },
  {
    question: "What's your ideal cricket group?",
    options: [
      { text: "People who discuss match tactics", type: "analyst", icon: Brain },
      { text: "Fans who share my excitement", type: "passionate", icon: Flame },
      { text: "People who love memes and jokes", type: "entertainer", icon: Laugh },
      { text: "Fans who share my team loyalty", type: "loyalist", icon: Heart },
    ],
  },
  {
    question: "What describes you best during a final?",
    options: [
      { text: "Predicting outcomes and analysing odds", type: "analyst", icon: Brain },
      { text: "Completely invested emotionally", type: "passionate", icon: Flame },
      { text: "Making the group laugh", type: "entertainer", icon: Laugh },
      { text: "Standing with my team till the end", type: "loyalist", icon: Heart },
    ],
  },
];

const profiles = {
  analyst: {
    name: "The Analyst",
    emoji: "🧠",
    tagline: "You see the game beyond the scoreboard.",
    description:
      "You love tactics, statistics, bowling changes and match strategy. You enjoy understanding WHY something happened.",
    strength: "Strategic thinking",
    tribe: "The Cricket Think Tank",
  },
  passionate: {
    name: "The Passionate",
    emoji: "🔥",
    tagline: "You don't watch cricket. You live it.",
    description:
      "Every boundary, wicket and close finish gives you an adrenaline rush. Cricket is an emotional experience for you.",
    strength: "Match-day energy",
    tribe: "The Adrenaline Club",
  },
  entertainer: {
    name: "The Entertainer",
    emoji: "😂",
    tagline: "Every match deserves a little banter.",
    description:
      "You bring humour, memes and fun conversations to cricket. You make every match more entertaining for others.",
    strength: "Social energy",
    tribe: "The Meme Pavilion",
  },
  loyalist: {
    name: "The Loyalist",
    emoji: "💙",
    tagline: "One team. One love. Through everything.",
    description:
      "Your loyalty defines your cricket experience. Win or lose, you stand behind your team.",
    strength: "Unshakeable loyalty",
    tribe: "The Loyal Supporters",
  },
};

function FanDNAQuiz({ currentUser }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);

  // Load the saved result belonging to this account.
  useEffect(() => {
    if (!currentUser?.id) {
      setResult(null);
      return;
    }

    try {
      const users = JSON.parse(
        localStorage.getItem("fanconnectUsers") || "[]"
      );

      const user = users.find(
        (item) => item.id === currentUser.id
      );

      setResult(user?.fanDNA?.profile || null);
      setCurrent(0);
      setAnswers([]);
    } catch (error) {
      console.error("Could not load Fan DNA:", error);
      setResult(null);
    }
  }, [currentUser?.id]);

  const selectAnswer = (type) => {
    const updated = [...answers];
    updated[current] = type;
    setAnswers(updated);
  };

  // Calculate and save Fan DNA to the signed-in account.
  const finishQuiz = () => {
    if (!currentUser?.id) {
      alert("Please sign in before completing your Fan DNA.");
      return;
    }

    const scores = {
      analyst: 0,
      passionate: 0,
      entertainer: 0,
      loyalist: 0,
    };

    answers.forEach((answer) => {
      if (answer) scores[answer]++;
    });

    const winner = Object.keys(scores).reduce((a, b) =>
      scores[a] >= scores[b] ? a : b
    );

    const fanDNAData = {
      type: winner,
      profile: profiles[winner],
      scores,
      answers,
      completedAt: new Date().toISOString(),
    };

    try {
      const users = JSON.parse(
        localStorage.getItem("fanconnectUsers") || "[]"
      );

      const updatedUsers = users.map((user) =>
        user.id === currentUser.id
          ? { ...user, fanDNA: fanDNAData }
          : user
      );

      localStorage.setItem(
        "fanconnectUsers",
        JSON.stringify(updatedUsers)
      );

      // Preserve compatibility with existing demo components.
      localStorage.setItem("fanconnectFanDNA", winner);
      localStorage.setItem(
        "fanconnectFanDNAProfile",
        JSON.stringify(profiles[winner])
      );

      setResult(profiles[winner]);
    } catch (error) {
      console.error("Could not save Fan DNA:", error);
      alert("Unable to save your Fan DNA. Please try again.");
    }
  };

  const restartQuiz = () => {
    setCurrent(0);
    setAnswers([]);
    setResult(null);

    // Remove only the saved result for the active account.
    if (!currentUser?.id) return;

    try {
      const users = JSON.parse(
        localStorage.getItem("fanconnectUsers") || "[]"
      );

      const updatedUsers = users.map((user) => {
        if (user.id !== currentUser.id) return user;

        const { fanDNA, ...userWithoutFanDNA } = user;
        return userWithoutFanDNA;
      });

      localStorage.setItem(
        "fanconnectUsers",
        JSON.stringify(updatedUsers)
      );

      localStorage.removeItem("fanconnectFanDNA");
      localStorage.removeItem("fanconnectFanDNAProfile");
    } catch (error) {
      console.error("Could not reset Fan DNA:", error);
    }
  };

  // RESULT SCREEN
  if (result) {
    return (
      <section className="dna-quiz-section" id="fan-dna">
        <div className="quiz-card result-card">

          <div className="quiz-eyebrow">
            <Sparkles size={16} /> YOUR FAN DNA REVEALED
          </div>

          <div className="result-emoji">{result.emoji}</div>

          <h2>{result.name}</h2>

          <h3>{result.tagline}</h3>

          <p>{result.description}</p>

          <div className="result-details">

            <div>
              <span>Your superpower</span>
              <strong>{result.strength}</strong>
            </div>

            <div>
              <span>Your suggested tribe</span>
              <strong>{result.tribe}</strong>
            </div>

          </div>

          <button className="quiz-primary" onClick={restartQuiz}>
            <RotateCcw size={16} /> Retake quiz
          </button>

        </div>
      </section>
    );
  }

  // QUIZ SCREEN
  return (
    <section className="dna-quiz-section" id="fan-dna">
      <div className="quiz-card">

        <div className="quiz-eyebrow">
          <Sparkles size={16} /> FAN DNA DISCOVERY
        </div>

        <div className="quiz-header">

          <div>
            <h2>Discover your Fan DNA.</h2>
            <p>Let's understand what makes you a cricket fan.</p>
          </div>

          <span className="question-count">
            {current + 1}/{questions.length}
          </span>

        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${((current + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        <h3 className="question-title">
          {questions[current].question}
        </h3>

        <div className="answer-options">

          {questions[current].options.map((option) => {
            const Icon = option.icon;
            const selected = answers[current] === option.type;

            return (
              <button
                key={option.type}
                className={`answer-option ${selected ? "selected" : ""}`}
                onClick={() => selectAnswer(option.type)}
              >
                <Icon size={20} />

                <span>{option.text}</span>

                <span className="option-check">
                  {selected ? "✓" : ""}
                </span>
              </button>
            );
          })}

        </div>

        <div className="quiz-navigation">

          <button
            className="quiz-back"
            disabled={current === 0}
            onClick={() => setCurrent(current - 1)}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <button
            className="quiz-primary"
            disabled={!answers[current]}
            onClick={() => {
              if (current === questions.length - 1) {
                finishQuiz();
              } else {
                setCurrent(current + 1);
              }
            }}
          >
            {current === questions.length - 1
              ? "Reveal my Fan DNA"
              : "Next question"}

            <ArrowRight size={16} />
          </button>

        </div>

      </div>
    </section>
  );
}

export default FanDNAQuiz;
