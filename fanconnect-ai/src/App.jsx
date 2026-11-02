
import { useState } from "react";

import {
  Trophy,
  Users,
  BrainCircuit,
  MessageCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Heart,
} from "lucide-react";

import MockGoogleAuth from "./components/MockGoogleAuth";
import FanDNAQuiz from "./components/FanDNAQuiz";
import TribeMatch from "./components/TribeMatch";
import TribeRoom from "./components/TribeRoom";

import "./App.css";

const features = [
  {
    icon: BrainCircuit,
    title: "Discover your Fan DNA",
    description:
      "Understand your cricket personality through an interactive AI-powered experience.",
    number: "01",
  },
  {
    icon: Users,
    title: "Find your Tribe",
    description:
      "Meet cricket fans who share your interests, energy and passion for the game.",
    number: "02",
  },
  {
    icon: MessageCircle,
    title: "Build real connections",
    description:
      "Join small fan communities, discuss matches and create unforgettable moments.",
    number: "03",
  },
];

const personalities = [
  {
    emoji: "🧠",
    name: "The Analyst",
    description: "Stats, tactics and match strategy.",
  },
  {
    emoji: "🔥",
    name: "The Passionate",
    description: "Every ball. Every emotion. Every moment.",
  },
  {
    emoji: "😂",
    name: "The Entertainer",
    description: "Memes, banter and endless cricket jokes.",
  },
  {
    emoji: "💙",
    name: "The Loyalist",
    description: "One team. One love. Through everything.",
  },
];

function App() {
  // Restore the previously signed-in mock account.
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const session = JSON.parse(
        sessionStorage.getItem("fanconnectSession") || "null"
      );

      const users = JSON.parse(
        localStorage.getItem("fanconnectUsers") || "[]"
      );

      if (!session?.userId) return null;

      return (
        users.find((user) => user.id === session.userId) || null
      );
    } catch (error) {
      console.error("Could not restore session:", error);
      return null;
    }
  });

  // Called after mock Google sign-in.
  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  // Log out the current user.
  const handleLogout = () => {
    sessionStorage.removeItem("fanconnectSession");
    // Remove any older shared session key from the previous implementation.
    localStorage.removeItem("fanconnectSession");
    setCurrentUser(null);
  };

  // Show authentication screen when nobody is signed in.
  if (!currentUser) {
    return <MockGoogleAuth onLogin={handleLogin} />;
  }

  return (
    <div className="app">

      {/* NAVIGATION */}

      <nav className="navbar">
        <a href="#home" className="brand">
          <span className="brand-symbol">
            <Trophy size={22} />
          </span>

          <span>
            FanConnect<span className="green">.</span>AI
          </span>
        </a>

        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#personalities">Fan DNA</a>
          <a href="#tribe-match">Community</a>
          <a href="#tribe-room">Tribe Room</a>
        </div>

        {/* SIGNED-IN USER */}

        <div className="nav-account">
          <div className="nav-user">
            <span className="nav-user-avatar">
              {currentUser.avatar ||
                currentUser.name.charAt(0).toUpperCase()}
            </span>

            <span>{currentUser.name}</span>
          </div>

          <button
            className="nav-logout"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      <main id="home">

        {/* HERO SECTION */}

        <section className="hero">

          <div className="hero-content">

            <div className="eyebrow">
              <span className="live-dot"></span>
              BUILT FOR THE LOVE OF CRICKET
            </div>

            <h1>
              Cricket is better
              <br />
              <span>when we're together.</span>
            </h1>

            <p className="hero-description">
              You're not just a cricket fan. You're a personality.
              Discover your Fan DNA and find people who experience
              the game just like you.
            </p>

            <div className="hero-actions">

              <a href="#fan-dna" className="primary-button">
                Discover your Fan DNA
                <ArrowRight size={18} />
              </a>

              <a href="#how-it-works" className="secondary-button">
                Explore the experience
              </a>

            </div>

            <div className="hero-proof">

              <div className="proof-icon">
                <Users size={19} />
              </div>

              <div>
                <strong>
                  More than just another fan community.
                </strong>

                <span>
                  Find people who truly get your cricket passion.
                </span>
              </div>

            </div>

          </div>

          {/* HERO VISUAL */}

          <div className="hero-visual">

            <div className="visual-glow"></div>

            <div className="visual-orbit orbit-one"></div>
            <div className="visual-orbit orbit-two"></div>

            <div className="main-ball">
              <Trophy size={72} strokeWidth={1.2} />
              <span>YOUR GAME. YOUR PEOPLE.</span>
            </div>

            <div className="floating-card analyst-card">
              <span className="floating-emoji">🧠</span>

              <div>
                <strong>The Analyst</strong>
                <span>Strategy obsessed</span>
              </div>
            </div>

            <div className="floating-card passion-card">
              <span className="floating-emoji">🔥</span>

              <div>
                <strong>The Passionate</strong>
                <span>Lives every delivery</span>
              </div>
            </div>

            <div className="floating-card fun-card">
              <span className="floating-emoji">😂</span>

              <div>
                <strong>The Entertainer</strong>
                <span>Memes & banter</span>
              </div>
            </div>

          </div>

        </section>

        {/* VALUE PROPOSITION */}

        <section className="value-strip">

          <div>
            <BrainCircuit />
            <span>Personality-driven AI</span>
          </div>

          <div>
            <Users />
            <span>Meaningful connections</span>
          </div>

          <div>
            <Heart />
            <span>Built around fandom</span>
          </div>

          <div>
            <ShieldCheck />
            <span>Safer communities</span>
          </div>

        </section>

        {/* HOW IT WORKS */}

        <section className="section" id="how-it-works">

          <div className="section-heading">

            <span className="section-label">
              A NEW WAY TO EXPERIENCE CRICKET
            </span>

            <h2>
              Your journey to finding
              <br />
              <span>your cricket tribe.</span>
            </h2>

            <p>
              Three simple steps. One community that understands you.
            </p>

          </div>

          <div className="feature-grid">

            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div className="feature-card" key={feature.number}>

                  <div className="feature-top">
                    <span>{feature.number}</span>
                    <Icon size={25} />
                  </div>

                  <h3>{feature.title}</h3>

                  <p>{feature.description}</p>

                  <div className="feature-arrow">
                    <ArrowRight size={17} />
                  </div>

                </div>
              );
            })}

          </div>

        </section>

        {/* FAN DNA PREVIEW */}

        <section className="dna-section" id="personalities">

          <div className="dna-content">

            <span className="section-label">
              EVERY FAN IS DIFFERENT
            </span>

            <h2>
              What's your
              <br />
              <span>Fan DNA?</span>
            </h2>

            <p>
              Some fans analyse every delivery. Some live for the
              celebrations. Others bring the memes and banter.
              Your cricket personality deserves its own tribe.
            </p>

            <a href="#fan-dna" className="primary-button">
              Discover my personality
              <ArrowRight size={17} />
            </a>

          </div>

          <div className="personality-grid">

            {personalities.map((personality) => (
              <div
                className="personality-card"
                key={personality.name}
              >

                <span className="personality-emoji">
                  {personality.emoji}
                </span>

                <h3>{personality.name}</h3>

                <p>{personality.description}</p>

              </div>
            ))}

          </div>

        </section>

        {/* COMMUNITY CTA */}

        <section className="community-section" id="community">

          <div className="community-icon">
            <Sparkles size={32} />
          </div>

          <span className="section-label">
            YOUR PEOPLE ARE OUT THERE
          </span>

          <h2>
            Don't watch cricket alone.
            <br />
            <span>Find your tribe.</span>
          </h2>

          <p>
            Discover your cricket personality and meet fans
            who make every match more exciting.
          </p>

          <a href="#tribe-match" className="primary-button">
            Get started <ArrowRight size={17} />
          </a>

        </section>

        {/* FAN DNA QUIZ */}

       <FanDNAQuiz currentUser={currentUser} />

        {/* AI TRIBEMATCH */}

       <TribeMatch currentUser={currentUser} />

        {/* TRIBE ROOM */}

       <TribeRoom currentUser={currentUser} />

      </main>

      {/* FOOTER */}

      <footer className="footer">

        <a href="#home" className="brand">
          <Trophy size={20} />

          <span>
            FanConnect<span className="green">.</span>AI
          </span>
        </a>

        <span>Built for fans. Powered by AI. 🏏</span>

        <span>
          Dream11 Internship Assignment · Concept Prototype
        </span>

      </footer>

    </div>
  );
}

export default App;
