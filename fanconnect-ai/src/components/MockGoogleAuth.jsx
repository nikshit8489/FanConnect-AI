import { useState } from "react";
import { Trophy, ArrowRight, ShieldCheck, Users } from "lucide-react";
import "./MockGoogleAuth.css";

function MockGoogleAuth({ onLogin }) {
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleGoogleContinue = () => {
    setError("");
    setShowAccountForm(true);
  };

  const handleLogin = (event) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      setError("Please enter your name and email.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("fanconnectUsers") || "[]");

    let user = users.find((item) => item.email === cleanEmail);

    if (!user) {
      user = {
        id: crypto.randomUUID(),
        name: cleanName,
        email: cleanEmail,
        avatar: cleanName.charAt(0).toUpperCase(),
        team: "",
        language: "English",
        personality: "",
        createdAt: new Date().toISOString(),
      };

      users.push(user);
    } else {
      // Preserve the existing profile for this email/account.
      user.name = user.name || cleanName;
    }

    localStorage.setItem("fanconnectUsers", JSON.stringify(users));

    // Keep the active login isolated to this browser tab.
    // This survives refresh, but separate tabs can sign in as different users.
    localStorage.removeItem("fanconnectSession");
    sessionStorage.setItem(
      "fanconnectSession",
      JSON.stringify({
        userId: user.id,
        email: user.email,
        loggedInAt: new Date().toISOString(),
      })
    );

    onLogin(user);
  };

  return (
    <div className="auth-page">
      <div className="auth-background-glow"></div>

      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Trophy size={25} />
          </div>
          <span>
            FanConnect<span className="auth-green">.</span>AI
          </span>
        </div>

        <div className="auth-card">
          <div className="auth-badge">
            <span className="auth-live-dot"></span>
            THE CRICKET FAN COMMUNITY
          </div>

          <div className="auth-hero-icon">
            <Users size={34} />
          </div>

          <h1>
            Your cricket tribe
            <br />
            <span>is waiting.</span>
          </h1>

          <p className="auth-description">
            Discover your Fan DNA, meet people who share
            your passion and experience cricket together.
          </p>

          {!showAccountForm ? (
            <>
              <button
                className="google-signin-button"
                onClick={handleGoogleContinue}
              >
                <span className="google-logo">G</span>
                Continue with Google
                <ArrowRight size={17} />
              </button>

              <div className="auth-divider">
                <span>YOUR NEXT CRICKET CONNECTION STARTS HERE</span>
              </div>
            </>
          ) : (
            <form className="mock-account-form" onSubmit={handleLogin}>
              <div className="mock-form-heading">
                <h2>Choose your demo account</h2>
                <p>
                  Enter your details to continue with simulated Google sign-in.
                </p>
              </div>

              <label htmlFor="mock-name">Your name</label>
              <input
                id="mock-name"
                type="text"
                placeholder="e.g. Nikshit Jain"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                required
              />

              <label htmlFor="mock-email">Google account email</label>
              <input
                id="mock-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && <p className="auth-error">{error}</p>}

              <button className="google-signin-button" type="submit">
                Continue to FanConnect
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                className="auth-back-button"
                onClick={() => setShowAccountForm(false)}
              >
                Back
              </button>
            </form>
          )}

          <div className="auth-security-note">
            <ShieldCheck size={16} />
            <span>
              Demo authentication · Profiles stay saved; login is isolated per tab.
            </span>
          </div>
        </div>

        <p className="auth-footer">
          BUILT FOR FANS. POWERED BY AI. 🏏
        </p>
      </div>
    </div>
  );
}

export default MockGoogleAuth;
