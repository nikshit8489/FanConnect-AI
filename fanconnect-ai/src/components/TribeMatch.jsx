
import { useMemo, useState, useEffect } from "react";
import {
  Users,
  Sparkles,
  ArrowRight,
  Brain,
  Flame,
  Laugh,
  Heart,
  Languages,
  Trophy,
  CheckCircle2,
  Target,
  UserPlus,
  Mail,
  Check,
  X,
} from "lucide-react";

import "./TribeMatch.css";

const teams = [
  "Mumbai Indians",
  "Chennai Super Kings",
  "Royal Challengers Bengaluru",
  "Kolkata Knight Riders",
  "Sunrisers Hyderabad",
  "Rajasthan Royals",
  "Delhi Capitals",
  "Punjab Kings",
  "Lucknow Super Giants",
  "Gujarat Titans",
];

const personalities = [
  { id: "analyst", name: "The Analyst", emoji: "🧠" },
  { id: "passionate", name: "The Passionate", emoji: "🔥" },
  { id: "entertainer", name: "The Entertainer", emoji: "😂" },
  { id: "loyalist", name: "The Loyalist", emoji: "💙" },
];

const interestMap = {
  analyst: "Tactical discussions",
  passionate: "Match excitement",
  entertainer: "Memes and banter",
  loyalist: "Team loyalty",
};

const personalityMap = {
  analyst: { name: "The Analyst", emoji: "🧠" },
  passionate: { name: "The Passionate", emoji: "🔥" },
  entertainer: { name: "The Entertainer", emoji: "😂" },
  loyalist: { name: "The Loyalist", emoji: "💙" },
};

// Read accounts saved by MockGoogleAuth and FanDNAQuiz.
const getRegisteredFans = (currentUserId) => {
  try {
    const users = JSON.parse(
      localStorage.getItem("fanconnectUsers") || "[]"
    );

    return users
      .filter((user) => {
        return (
          user.id !== currentUserId &&
          user.fanDNA?.type &&
          user.name
        );
      })
      .map((user) => {
        const personality =
          user.fanDNA.type.toLowerCase();

        const profile = personalityMap[personality];

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          team: user.team || "Not selected",
          language: user.language || "English",
          personality,
          interest:
            interestMap[personality] || "Cricket discussions",
          avatar: profile?.emoji || "🏏",
          bio:
            user.fanDNA.profile?.description ||
            profile?.name ||
            "A cricket fan looking to connect.",
        };
      });
  } catch (error) {
    console.error("Error reading registered fans:", error);
    return [];
  }
};

const compatibility = (user, fan) => {
  let score = 0;
  const reasons = [];

  // Shared language: 35 points
  if (user.language === fan.language) {
    score += 35;
    reasons.push("You speak the same language");
  }

  // Same favourite team: 20 points
  if (user.team === fan.team) {
    score += 20;
    reasons.push("You support the same IPL team");
  }

  // Complementary personality: 25 points
  if (user.personality !== fan.personality) {
    score += 25;
    reasons.push(
      "Your cricket personalities complement each other"
    );
  } else {
    score += 15;
    reasons.push(
      "You share a similar cricket personality"
    );
  }

  // Shared interests: 20 points
  if (
    interestMap[user.personality] === fan.interest
  ) {
    score += 20;
    reasons.push(
      "You enjoy similar cricket conversations"
    );
  }

  return {
    ...fan,
    score,
    reasons,
  };
};

function TribeMatch({ currentUser }) {
  const [name, setName] = useState(
    currentUser?.name || ""
  );

  const [team, setTeam] = useState(
    currentUser?.team || "Mumbai Indians"
  );

  const [language, setLanguage] = useState(
    currentUser?.language || "English"
  );

  const [personality, setPersonality] = useState(
    currentUser?.fanDNA?.type ||
      localStorage.getItem("fanconnectFanDNA") ||
      "entertainer"
  );

  const [showResults, setShowResults] = useState(false);
  const [registeredFans, setRegisteredFans] = useState(
    () => getRegisteredFans(currentUser?.id)
  );

  const [invitations, setInvitations] = useState(
    () =>
      JSON.parse(
        localStorage.getItem("fanconnectInvitations") || "[]"
      )
  );

  const selectedPersonality = personalities.find(
    (p) => p.id === personality
  );

  // Refresh the account list when the user searches.
  const refreshFans = () => {
    setRegisteredFans(getRegisteredFans(currentUser?.id));
    setInvitations(
      JSON.parse(
        localStorage.getItem("fanconnectInvitations") || "[]"
      )
    );
  };

  // Update if another browser tab changes invitation data.
  useEffect(() => {
    const handleStorageChange = () => {
      refreshFans();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, [currentUser?.id]);

  const recommendations = useMemo(() => {
    if (!showResults || !currentUser?.id) return [];

    return registeredFans
      .map((fan) =>
        compatibility(
          { team, language, personality },
          fan
        )
      )
      .sort((a, b) => b.score - a.score);
  }, [
    showResults,
    registeredFans,
    team,
    language,
    personality,
    currentUser?.id,
  ]);

  // Pending invitations received by the logged-in user.
  const receivedInvitations = invitations.filter(
    (invitation) =>
      invitation.toUserId === currentUser?.id &&
      invitation.status === "pending"
  );

  const findTribe = (event) => {
    event.preventDefault();

    if (!name.trim() || !currentUser?.id) {
      return;
    }

    // Save this user's selected matchmaking profile.
    const users = JSON.parse(
      localStorage.getItem("fanconnectUsers") || "[]"
    );

    const updatedUsers = users.map((user) => {
      if (user.id !== currentUser.id) {
        return user;
      }

      return {
        ...user,
        name: name.trim(),
        team,
        language,
        personality,
      };
    });

    localStorage.setItem(
      "fanconnectUsers",
      JSON.stringify(updatedUsers)
    );

    refreshFans();
    setShowResults(true);
  };

  const sendInvitation = (fan) => {
    if (!currentUser?.id || !fan.id) {
      alert("Please sign in first.");
      return;
    }

    const existingInvitations = JSON.parse(
      localStorage.getItem("fanconnectInvitations") || "[]"
    );

    const alreadyInvited = existingInvitations.some(
      (invitation) =>
        invitation.fromUserId === currentUser.id &&
        invitation.toUserId === fan.id &&
        invitation.status === "pending"
    );

    if (alreadyInvited) {
      alert("You have already invited this fan.");
      return;
    }

    const invitation = {
      id: crypto.randomUUID(),
      fromUserId: currentUser.id,
      fromName: currentUser.name || name,
      fromEmail: currentUser.email,
      toUserId: fan.id,
      toName: fan.name,
      toEmail: fan.email,
      roomId: crypto.randomUUID(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const updatedInvitations = [
      ...existingInvitations,
      invitation,
    ];

    localStorage.setItem(
      "fanconnectInvitations",
      JSON.stringify(updatedInvitations)
    );

    setInvitations(updatedInvitations);

    alert(`Invitation sent to ${fan.name}!`);
  };

  const respondToInvitation = (invitationId, response) => {
    const updatedInvitations = invitations.map(
      (invitation) => {
        if (
          invitation.id === invitationId &&
          invitation.toUserId === currentUser?.id
        ) {
          return {
            ...invitation,
            status: response,
            respondedAt: new Date().toISOString(),
          };
        }

        return invitation;
      }
    );

    localStorage.setItem(
      "fanconnectInvitations",
      JSON.stringify(updatedInvitations)
    );

    setInvitations(updatedInvitations);

    if (response === "accepted") {
      alert(
        "Invitation accepted! Shared TribeRoom integration is the next step."
      );
    }
  };

  const reset = () => {
    setShowResults(false);
    refreshFans();
  };

  if (!currentUser?.id) {
    return (
      <section className="tribe-section" id="tribe-match">
        <div className="tribe-heading">
          <h2>
            Please sign in to find your cricket tribe.
          </h2>
        </div>
      </section>
    );
  }

  return (
    <section className="tribe-section" id="tribe-match">
      <div className="tribe-heading">
        <span className="tribe-label">
          <Sparkles size={15} />
          YOUR NEXT CRICKET CONNECTION
        </span>

        <h2>
          Find your <span>cricket tribe.</span>
        </h2>

        <p>
          Connect with registered cricket fans who share
          your passion and complement your personality.
        </p>
      </div>

      {/* Received invitations */}
      {receivedInvitations.length > 0 && (
        <div className="tribe-results">
          <div className="recommendation-heading">
            <Mail size={19} />
            <strong>Your Tribe Invitations</strong>
          </div>

          {receivedInvitations.map((invitation) => (
            <div
              className="fan-card"
              key={invitation.id}
            >
              <div className="fan-avatar">🏏</div>

              <div className="fan-info">
                <h4>{invitation.fromName}</h4>
                <p>
                  {invitation.fromEmail ||
                    "A cricket fan"}{" "}
                  invited you to join their tribe.
                </p>

                <div className="match-reasons">
                  <button
                    type="button"
                    onClick={() =>
                      respondToInvitation(
                        invitation.id,
                        "accepted"
                      )
                    }
                  >
                    <Check size={14} />
                    Accept
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      respondToInvitation(
                        invitation.id,
                        "declined"
                      )
                    }
                  >
                    <X size={14} />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showResults ? (
        <form
          className="tribe-form"
          onSubmit={findTribe}
        >
          <div className="form-header">
            <Target size={23} />

            <div>
              <h3>Create your fan profile</h3>
              <p>
                Let's find people who understand your
                cricket energy.
              </p>
            </div>
          </div>

          <div className="form-group">
            <label>Your name</label>

            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label>
              <Trophy size={15} />
              Favourite IPL team
            </label>

            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            >
              {teams.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <Languages size={15} />
              Preferred language
            </label>

            <div className="language-options">
              {["English", "Hindi"].map((item) => (
                <button
                  type="button"
                  key={item}
                  className={
                    language === item
                      ? "language-active"
                      : ""
                  }
                  onClick={() => setLanguage(item)}
                >
                  {item}

                  {language === item && (
                    <CheckCircle2 size={15} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>
              <Brain size={15} />
              Your Fan DNA personality
            </label>

            <div className="dna-options">
              {personalities.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={
                    personality === item.id
                      ? "dna-active"
                      : ""
                  }
                  onClick={() =>
                    setPersonality(item.id)
                  }
                >
                  <span>{item.emoji}</span>
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <button
            className="find-tribe-button"
            type="submit"
          >
            Find my tribe
            <ArrowRight size={18} />
          </button>

          <p className="privacy-note">
            <CheckCircle2 size={13} />
            Your profile is used for matchmaking.
          </p>
        </form>
      ) : (
        <div className="tribe-results">
          <div className="results-top">
            <div>
              <span className="tribe-label">
                <Sparkles size={14} />
                MATCHMAKING COMPLETE
              </span>

              <h3>
                Your fan recommendations, {name}!
              </h3>

              <p>
                {selectedPersonality?.emoji}{" "}
                {selectedPersonality?.name}
                {" · "}
                {team}
                {" · "}
                {language}
              </p>
            </div>

            <button
              className="edit-profile"
              type="button"
              onClick={reset}
            >
              Edit profile
            </button>
          </div>

          <div className="recommendation-heading">
            <Users size={19} />
            <strong>
              Fans you might connect with
            </strong>
          </div>

          {recommendations.length === 0 ? (
            <div className="demo-notice">
              <Users size={16} />
              No registered fans with completed FanDNA
              were found yet. Sign in with another
              account and complete FanDNA first.
            </div>
          ) : (
            <div className="fan-list">
              {recommendations.map((fan, index) => (
                <div
                  className="fan-card"
                  key={fan.id}
                >
                  <div className="fan-avatar">
                    {fan.avatar}
                  </div>

                  <div className="fan-info">
                    <div className="fan-name-row">
                      <h4>{fan.name}</h4>

                      {index === 0 && (
                        <span className="top-match">
                          TOP MATCH
                        </span>
                      )}
                    </div>

                    <p>{fan.team}</p>

                    <span className="fan-meta">
                      {fan.language}
                      {" · "}
                      {fan.interest}
                    </span>

                    <p className="fan-bio">
                      {fan.bio}
                    </p>

                    <div className="match-reasons">
                      {fan.reasons.map((reason) => (
                        <span key={reason}>
                          <CheckCircle2 size={12} />
                          {reason}
                        </span>
                      ))}
                    </div>

                    <button
                      className="find-tribe-button"
                      type="button"
                      onClick={() =>
                        sendInvitation(fan)
                      }
                    >
                      <UserPlus size={17} />
                      Invite to Tribe
                    </button>
                  </div>

                  <div className="compatibility-score">
                    <strong>{fan.score}%</strong>
                    <span>Match</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="demo-notice">
            <Sparkles size={16} />
            Recommendations are generated from
            registered browser accounts using the
            compatibility scoring algorithm.
          </div>

          <button
            className="find-tribe-button"
            type="button"
            onClick={reset}
          >
            <ArrowRight size={17} />
            Try another profile
          </button>
        </div>
      )}
    </section>
  );
}

export default TribeMatch;
