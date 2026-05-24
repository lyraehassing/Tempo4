import { useState, useEffect } from "react";

// ---- Design system ----
const colors = {
  bg: "#0a0a0f",
  card: "#13131a",
  cardBorder: "#1e1e2e",
  accent: "#00e5cc",
  accentDim: "#00a896",
  muted: "#3a3a4a",
  text: "#f0f0f5",
  textSub: "#7a7a9a",
  warn: "#f5a623",
  spotify: "#1DB954",
  apple: "#fc3c44",
};

const font = {
  display: "'Bebas Neue', sans-serif",
  body: "'DM Sans', sans-serif",
};

const gStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${colors.bg}; font-family: ${font.body}; color: ${colors.text}; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 ${colors.accent}55; }
    50%       { box-shadow: 0 0 0 14px ${colors.accent}00; }
  }
  .fade-up { animation: fadeUp 0.5s ease both; }
  .delay-1 { animation-delay: 0.08s; }
  .delay-2 { animation-delay: 0.16s; }
  .delay-3 { animation-delay: 0.24s; }
  .delay-4 { animation-delay: 0.32s; }
`;

// ---- Constants ----
const activities = ["🏃 Run","🏋️ Gym","🏀 Sport","🚴 Ride","🧘 Yoga","⚽ Soccer","🏊 Swim","🥊 Boxing"];
const moods      = ["😴","😐","🙂","😤","🔥"];
const moodLabels = ["Dead","Meh","OK","Pumped","ON FIRE"];
const AVG_SONG_MINUTES = 3.5;

// ---- Saved playlists storage (in-memory, persists during session) ----
// In a real app this would go to a database. For now it lives in React state
// lifted to the root so every screen can read/write it.

// ---- Demo song banks (used when API isn't available) ----
// Real app uses AI; this lets you test all features in the mockup.
const DEMO_SONGS = {
  hype: [
    { title: "HUMBLE.", artist: "Kendrick Lamar" },
    { title: "Lose Yourself", artist: "Eminem" },
    { title: "Power", artist: "Kanye West" },
    { title: "Till I Collapse", artist: "Eminem" },
    { title: "Blinding Lights", artist: "The Weeknd" },
    { title: "Can't Hold Us", artist: "Macklemore & Ryan Lewis" },
    { title: "Stronger", artist: "Kanye West" },
    { title: "Jump", artist: "Kris Kross" },
    { title: "Eye of the Tiger", artist: "Survivor" },
    { title: "Thunderstruck", artist: "AC/DC" },
    { title: "Run the World", artist: "Beyoncé" },
    { title: "Remember the Name", artist: "Fort Minor" },
    { title: "All I Do Is Win", artist: "DJ Khaled" },
    { title: "Welcome to the Jungle", artist: "Guns N' Roses" },
    { title: "Seven Nation Army", artist: "The White Stripes" },
    { title: "Radioactive", artist: "Imagine Dragons" },
    { title: "Believer", artist: "Imagine Dragons" },
    { title: "Bang Bang", artist: "will.i.am" },
  ],
  chill: [
    { title: "Golden Hour", artist: "JVKE" },
    { title: "Redbone", artist: "Childish Gambino" },
    { title: "Levitating", artist: "Dua Lipa" },
    { title: "Breathe (2 AM)", artist: "Anna Nalick" },
    { title: "Sunday Morning", artist: "Maroon 5" },
    { title: "Sunset Lover", artist: "Petit Biscuit" },
    { title: "Better Together", artist: "Jack Johnson" },
    { title: "Slow Dancing in the Dark", artist: "Joji" },
    { title: "Lost in Japan", artist: "Shawn Mendes" },
    { title: "Ocean Eyes", artist: "Billie Eilish" },
    { title: "Come As You Are", artist: "Nirvana" },
    { title: "Banana Pancakes", artist: "Jack Johnson" },
  ],
};

const DEMO_TITLES = {
  pre: {
    high: ["BEAST MODE MIX", "FIRE UP SESSION", "LOCKED IN", "NO DAYS OFF"],
    low:  ["WAKE UP MIX", "SLOW BURN BUILD", "EASY DOES IT", "GENTLE START"],
  },
  post: ["RECOVER & VIBE", "COOL DOWN FLOW", "GOLDEN HOUR MIX", "SOFT LANDING"],
};

function makeDemoPlaylist({ moodIndex, phase, songCount }) {
  const isHype  = phase === "pre" && moodIndex >= 2;
  const bank    = isHype ? DEMO_SONGS.hype : DEMO_SONGS.chill;
  // Shuffle and pick songCount songs
  const shuffled = [...bank].sort(() => Math.random() - 0.5).slice(0, songCount);

  const titleBank = phase === "pre"
    ? (isHype ? DEMO_TITLES.pre.high : DEMO_TITLES.pre.low)
    : DEMO_TITLES.post;
  const title = titleBank[Math.floor(Math.random() * titleBank.length)];

  const vibes = isHype
    ? ["High-energy bangers to fuel every rep.", "Pure fire to keep you locked in."]
    : ["Smooth tracks to ease you back down.", "Mellow grooves for your recovery."];
  const vibe = vibes[Math.floor(Math.random() * vibes.length)];

  return { title, vibe, songs: shuffled };
}

// ---- AI: generate playlist ----
// Tries the real Claude API first; falls back to demo mode if unavailable.
async function generatePlaylist({ activity, moodIndex, phase, duration, intensity }) {
  const moodWord  = moodLabels[moodIndex];
  const isWorkout = phase === "pre";
  const songCount = duration
    ? Math.max(4, Math.round(duration / AVG_SONG_MINUTES))
    : 6;

  const prompt = `You are a music curator for a fitness app.
Generate a ${isWorkout ? "workout" : "post-workout cooldown"} playlist for someone who:
- Activity: ${activity}
- Mood: ${moodWord} (${moodIndex + 1}/5 energy)
- Workout duration: ${duration ? `${duration} minutes` : "unknown"}
- Intensity: ${intensity ? `${intensity}/10` : "unknown"}
- Phase: ${isWorkout ? "about to work out — needs motivation" : "just finished — needs to wind down"}

Generate exactly ${songCount} songs to fill approximately ${duration || 20} minutes of listening.
Average song length is ${AVG_SONG_MINUTES} minutes, so ${songCount} songs ≈ ${Math.round(songCount * AVG_SONG_MINUTES)} minutes.

Respond ONLY with a valid JSON object, no extra text, no markdown:
{
  "title": "PLAYLIST NAME IN CAPS (max 4 words)",
  "vibe": "One sentence describing the vibe (max 12 words)",
  "songs": [
    {"title": "Song Title", "artist": "Artist Name"}
  ]
}`;

  // Demo mode — simulates AI with a realistic delay.
  // In your deployed app, replace this block with a real API call to your backend.
  await new Promise(r => setTimeout(r, 1400));
  return makeDemoPlaylist({ moodIndex, phase, songCount });
}

// ---- Spotify: build a URI that opens the app to search for each song ----
// We create one search link per song so the user can find & add them easily.
function spotifySearchUrl(song) {
  const q = encodeURIComponent(`${song.title} ${song.artist}`);
  return `https://open.spotify.com/search/${q}`;
}
function spotifyPlaylistUrl(playlist) {
  // Search for the whole playlist by title — closest we can get without API auth
  const q = encodeURIComponent(`${playlist.title} ${playlist.songs[0]?.artist || ""}`);
  return `https://open.spotify.com/search/${q}`;
}
function appleMusicUrl(playlist) {
  return `https://music.apple.com/search?term=${encodeURIComponent(playlist.title)}`;
}

// ==============================
// SHARED COMPONENTS
// ==============================
function Phone({ children }) {
  return (
    <div style={{
      width: 375, minHeight: 780, background: colors.bg,
      borderRadius: 44, border: `2px solid ${colors.cardBorder}`,
      overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: "0 40px 120px #000a", position: "relative",
    }}>
      <div style={{ height: 44, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 28px",
        fontSize: 12, color: colors.textSub, flexShrink: 0 }}>
        <span>9:41</span>
        <div style={{ width: 120, height: 28, background: "#000",
          borderRadius: 20, position: "absolute", left: "50%",
          transform: "translateX(-50%)", top: 8 }} />
        <span>▪▪▪ 100%</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 90px" }}>
        {children}
      </div>
    </div>
  );
}

function Nav({ screen, setScreen }) {
  const items = [
    { id: "home",    icon: "⚡", label: "Home"    },
    { id: "pre",     icon: "🎵", label: "Start"   },
    { id: "post",    icon: "✅", label: "Log"     },
    { id: "saved",   icon: "💾", label: "Saved"   },
    { id: "history", icon: "📈", label: "History" },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
      background: colors.card, borderTop: `1px solid ${colors.cardBorder}`,
      display: "flex", alignItems: "center", justifyContent: "space-around",
      padding: "0 4px 8px",
    }}>
      {items.map(it => (
        <button key={it.id} onClick={() => setScreen(it.id)} style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 2, color: screen === it.id ? colors.accent : colors.textSub,
          fontFamily: font.body, fontSize: 10, fontWeight: 500,
          transition: "color 0.2s",
        }}>
          <span style={{ fontSize: 18 }}>{it.icon}</span>
          {it.label}
        </button>
      ))}
    </div>
  );
}

function Card({ children, style = {}, className = "" }) {
  return (
    <div className={className} style={{
      background: colors.card, border: `1px solid ${colors.cardBorder}`,
      borderRadius: 20, padding: "18px 20px", ...style,
    }}>
      {children}
    </div>
  );
}

function BigButton({ label, onClick, sub }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "18px 24px",
      background: colors.accent, color: "#0a0a0f",
      border: "none", borderRadius: 20, cursor: "pointer",
      fontFamily: font.display, fontSize: 26, letterSpacing: 1,
      animation: "pulse 2.4s infinite",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    }}>
      {label}
      {sub && <span style={{ fontFamily: font.body, fontSize: 12,
        fontWeight: 500, color: "#0a0a0f99" }}>{sub}</span>}
    </button>
  );
}

// ---- MoodPicker (reused in Pre and Post) ----
function MoodPicker({ mood, setMood, label = "How are you feeling?" }) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ color: colors.textSub, fontSize: 11,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
        {label}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
        {moods.map((m, i) => (
          <button key={i} onClick={() => setMood(i)} style={{
            flex: 1,
            background: mood === i ? colors.accent + "22" : "none",
            border: mood === i ? `2px solid ${colors.accent}` : `2px solid ${colors.muted}`,
            borderRadius: 14, padding: "10px 4px", cursor: "pointer",
            transition: "all 0.15s", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <span style={{ fontSize: 24 }}>{m}</span>
            <span style={{ fontSize: 9, fontFamily: font.body,
              color: mood === i ? colors.accent : colors.textSub }}>
              {moodLabels[i]}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

// ---- PlaylistCard: shows songs + save + Spotify/Apple export ----
function PlaylistCard({ playlist, activity, duration, phase, onSave, saved, onNext, nextLabel }) {
  const [justSaved, setJustSaved] = useState(false);

  function handleSave() {
    onSave(playlist, { activity, duration, phase });
    setJustSaved(true);
  }

  const songCount = playlist.songs.length;
  const estMins   = Math.round(songCount * AVG_SONG_MINUTES);

  return (
    <Card className="fade-up" style={{
      border: `1px solid ${colors.accent}66`,
      background: "linear-gradient(135deg, #0a1a18, #13131a)",
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <div style={{ color: colors.accent, fontSize: 11,
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            ✨ AI Playlist · {songCount} songs · ~{estMins} min
          </div>
          <div style={{ fontFamily: font.display, fontSize: 22 }}>
            {playlist.title}
          </div>
        </div>
        {/* Save button */}
        <button onClick={handleSave} disabled={saved || justSaved} style={{
          background: saved || justSaved ? colors.muted : colors.accent,
          color: saved || justSaved ? colors.textSub : "#0a0a0f",
          border: "none", borderRadius: 10, padding: "6px 12px",
          fontFamily: font.body, fontSize: 11, fontWeight: 600,
          cursor: saved || justSaved ? "default" : "pointer",
          transition: "all 0.2s", whiteSpace: "nowrap", marginLeft: 8,
        }}>
          {saved || justSaved ? "✓ Saved" : "💾 Save"}
        </button>
      </div>
      <div style={{ color: colors.textSub, fontSize: 13, marginBottom: 14 }}>
        {playlist.vibe}
      </div>

      {/* Song list — each song links to Spotify search */}
      {playlist.songs.map((s, i) => (
        <a key={i} href={spotifySearchUrl(s)} target="_blank" rel="noreferrer"
          style={{ textDecoration: "none", display: "flex", alignItems: "center",
            gap: 10, padding: "9px 0", borderBottom: `1px solid ${colors.muted}`,
            color: "inherit" }}>
          <span style={{ color: colors.accent, fontFamily: font.display,
            fontSize: 14, width: 18 }}>{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{s.title}</div>
            <div style={{ fontSize: 11, color: colors.textSub }}>{s.artist}</div>
          </div>
          {/* Spotify icon — tap to search this song */}
          <span style={{ fontSize: 14, color: colors.spotify }}>♫</span>
        </a>
      ))}

      {/* Export buttons */}
      <div style={{ fontSize: 11, color: colors.textSub,
        textAlign: "center", margin: "12px 0 8px" }}>
        Tap any song to search on Spotify, or open the full playlist:
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <a href={spotifyPlaylistUrl(playlist)} target="_blank" rel="noreferrer"
          style={{
            flex: 1, padding: "12px 8px", borderRadius: 12,
            background: colors.spotify, color: "#fff", textDecoration: "none",
            textAlign: "center", fontFamily: font.body,
            fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}>🎵 Search on Spotify</a>
        <a href={appleMusicUrl(playlist)} target="_blank" rel="noreferrer"
          style={{
            flex: 1, padding: "12px 8px", borderRadius: 12,
            background: colors.apple, color: "#fff", textDecoration: "none",
            textAlign: "center", fontFamily: font.body,
            fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}>🍎 Apple Music</a>
      </div>

      {onNext && (
        <button onClick={onNext} style={{
          width: "100%", marginTop: 10, padding: "14px",
          background: colors.accent, color: "#0a0a0f",
          border: "none", borderRadius: 14, cursor: "pointer",
          fontFamily: font.display, fontSize: 20,
        }}>{nextLabel}</button>
      )}
    </Card>
  );
}

// ==============================
// SCREEN 1 — HOME
// ==============================
function HomeScreen({ setScreen, savedPlaylists }) {
  const streak   = 6;
  const weekDays = ["M","T","W","T","F","S","S"];
  const done     = [true,true,true,true,true,true,false];
  const lastSaved = savedPlaylists[savedPlaylists.length - 1];

  return (
    <div style={{ padding: "8px 20px 0" }}>
      <div className="fade-up" style={{ display: "flex",
        justifyContent: "space-between", alignItems: "center",
        marginBottom: 24, marginTop: 4 }}>
        <div>
          <div style={{ fontFamily: font.display, fontSize: 32,
            letterSpacing: 1, lineHeight: 1 }}>PULSEPLAY</div>
          <div style={{ color: colors.textSub, fontSize: 13, marginTop: 2 }}>
            Sunday, May 24
          </div>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: "50%",
          background: colors.muted, display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          👤
        </div>
      </div>

      {/* Streak */}
      <Card className="fade-up delay-1" style={{ marginBottom: 16,
        background: "linear-gradient(135deg, #0a1a18, #13131a)",
        border: `1px solid ${colors.accent}44` }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ color: colors.textSub, fontSize: 12,
              fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>
              Current Streak</div>
            <div style={{ fontFamily: font.display, fontSize: 48,
              color: colors.accent, lineHeight: 1.1 }}>
              {streak} <span style={{ fontSize: 24 }}>DAYS 🔥</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: colors.textSub, fontSize: 11 }}>Best</div>
            <div style={{ fontFamily: font.display, fontSize: 24,
              color: colors.textSub }}>14</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          {weekDays.map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: "50%",
                background: done[i] ? colors.accent : colors.muted,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, color: done[i] ? "#0a0a0f" : colors.textSub,
                fontWeight: 700,
              }}>{done[i] ? "✓" : ""}</div>
              <div style={{ fontSize: 10, color: colors.textSub, marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="fade-up delay-2" style={{ marginBottom: 16 }}>
        <BigButton label="START SESSION"
          sub="Check in + get your AI playlist"
          onClick={() => setScreen("pre")} />
      </div>

      {/* Last saved playlist quick-access */}
      {lastSaved && (
        <Card className="fade-up delay-3" style={{ marginBottom: 16,
          cursor: "pointer" }} onClick={() => setScreen("saved")}>
          <div style={{ color: colors.textSub, fontSize: 11,
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Last Saved Playlist</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28 }}>🎵</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: font.display, fontSize: 18 }}>
                {lastSaved.playlist.title}
              </div>
              <div style={{ color: colors.textSub, fontSize: 12 }}>
                {lastSaved.playlist.songs.length} songs · {lastSaved.activity} · {lastSaved.date}
              </div>
            </div>
            <span style={{ color: colors.accent }}>→</span>
          </div>
        </Card>
      )}

      {/* Stats */}
      <Card className="fade-up delay-4">
        <div style={{ color: colors.textSub, fontSize: 11,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
          This Week</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[
            { label: "Workouts",  val: "6",    unit: "sessions"   },
            { label: "Avg Mood↑", val: "+2.4", unit: "pts after"  },
            { label: "Playlists", val: String(savedPlaylists.length || 0), unit: "saved" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: font.display, fontSize: 28,
                color: colors.accent }}>{s.val}</div>
              <div style={{ fontSize: 11, color: colors.textSub }}>{s.label}</div>
              <div style={{ fontSize: 10, color: colors.muted }}>{s.unit}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ==============================
// SCREEN 2 — PRE-WORKOUT
// ==============================
function PreScreen({ setScreen, onSave, savedPlaylists }) {
  const [activity, setActivity] = useState(null);
  const [mood,     setMood]     = useState(null);
  const [duration, setDuration] = useState(30);
  const [playlist, setPlaylist] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // Check if this playlist was already saved
  const isSaved = playlist
    ? savedPlaylists.some(s => s.playlist.title === playlist.title)
    : false;

  const canGenerate = activity !== null && mood !== null;

  async function handleGenerate() {
    setLoading(true); setError(null);
    try {
      const result = await generatePlaylist({
        activity: activities[activity],
        moodIndex: mood, phase: "pre", duration,
      });
      setPlaylist(result);
    } catch (e) { setError("Couldn't generate — try again!"); }
    setLoading(false);
  }

  return (
    <div style={{ padding: "8px 20px 0" }}>
      <div className="fade-up" style={{ marginBottom: 20 }}>
        <div style={{ color: colors.textSub, fontSize: 12,
          textTransform: "uppercase", letterSpacing: 1 }}>Step 1 of 2</div>
        <div style={{ fontFamily: font.display, fontSize: 36, lineHeight: 1.1 }}>
          PRE-WORKOUT<br/>CHECK-IN
        </div>
      </div>

      {/* Activity */}
      <Card className="fade-up delay-1" style={{ marginBottom: 16 }}>
        <div style={{ color: colors.textSub, fontSize: 11,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          What are you doing?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {activities.map((a, i) => (
            <button key={i} onClick={() => setActivity(i)} style={{
              background: activity === i ? colors.accent : colors.muted,
              color: activity === i ? "#0a0a0f" : colors.text,
              border: "none", borderRadius: 12, padding: "10px 8px",
              fontFamily: font.body, fontSize: 13, fontWeight: 500,
              cursor: "pointer", transition: "all 0.15s",
            }}>{a}</button>
          ))}
        </div>
      </Card>

      {/* Duration — used to calculate song count */}
      <Card className="fade-up delay-2" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 10 }}>
          <div style={{ color: colors.textSub, fontSize: 11,
            textTransform: "uppercase", letterSpacing: 1 }}>Workout Length</div>
          <div>
            <span style={{ fontFamily: font.display, fontSize: 28,
              color: colors.accent }}>{duration} min</span>
            <span style={{ color: colors.textSub, fontSize: 12,
              marginLeft: 6 }}>~{Math.round(duration / AVG_SONG_MINUTES)} songs</span>
          </div>
        </div>
        <input type="range" min={10} max={120} step={5} value={duration}
          onChange={e => setDuration(+e.target.value)}
          style={{ width: "100%", accentColor: colors.accent }} />
        <div style={{ display: "flex", justifyContent: "space-between",
          fontSize: 11, color: colors.textSub, marginTop: 4 }}>
          <span>10 min</span><span>2 hours</span>
        </div>
      </Card>

      {/* Mood */}
      <div className="fade-up delay-3">
        <MoodPicker mood={mood} setMood={setMood} label="How are you feeling?" />
      </div>

      {error && <div style={{ color: colors.warn, fontSize: 13,
        textAlign: "center", marginBottom: 12 }}>{error}</div>}

      {!playlist && (
        <div className="fade-up delay-4">
          <button onClick={handleGenerate} disabled={!canGenerate || loading} style={{
            width: "100%", padding: "18px",
            background: canGenerate ? colors.accent : colors.muted,
            color: canGenerate ? "#0a0a0f" : colors.textSub,
            border: "none", borderRadius: 20,
            cursor: canGenerate ? "pointer" : "not-allowed",
            fontFamily: font.display, fontSize: 24, letterSpacing: 1,
            transition: "all 0.2s", opacity: loading ? 0.75 : 1,
          }}>
            {loading ? "🎵 AI IS THINKING..." : "🎵 BUILD MY PLAYLIST"}
          </button>
          {loading && (
            <div style={{ textAlign: "center", color: colors.textSub,
              fontSize: 12, marginTop: 10 }}>
              Claude is curating {Math.round(duration / AVG_SONG_MINUTES)} songs for your {duration} min session...
            </div>
          )}
        </div>
      )}

      {playlist && (
        <PlaylistCard
          playlist={playlist}
          activity={activities[activity]}
          duration={duration}
          phase="pre"
          onSave={onSave}
          saved={isSaved}
          onNext={() => setScreen("post")}
          nextLabel="LET'S GO →"
        />
      )}
    </div>
  );
}

// ==============================
// SCREEN 3 — POST-WORKOUT
// ==============================
function PostScreen({ setScreen, onSave, savedPlaylists }) {
  const [duration,  setDuration]  = useState(30);
  const [intensity, setIntensity] = useState(5);
  const [mood,      setMood]      = useState(null);
  const [playlist,  setPlaylist]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const isSaved = playlist
    ? savedPlaylists.some(s => s.playlist.title === playlist.title)
    : false;

  async function handleGenerate() {
    setLoading(true); setError(null);
    try {
      const result = await generatePlaylist({
        activity: "cooldown after workout",
        moodIndex: mood, phase: "post",
        // cooldown playlist = 20% of workout time, min 10 min
        duration: Math.max(10, Math.round(duration * 0.2)),
        intensity,
      });
      setPlaylist(result);
    } catch (e) { setError("Couldn't generate — try again!"); }
    setLoading(false);
  }

  return (
    <div style={{ padding: "8px 20px 0" }}>
      <div className="fade-up" style={{ marginBottom: 20 }}>
        <div style={{ color: colors.accent, fontSize: 12,
          textTransform: "uppercase", letterSpacing: 1 }}>Nice work! 💪</div>
        <div style={{ fontFamily: font.display, fontSize: 36, lineHeight: 1.1 }}>
          POST-WORKOUT<br/>LOG
        </div>
      </div>

      {/* Duration */}
      <Card className="fade-up delay-1" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 10 }}>
          <div style={{ color: colors.textSub, fontSize: 11,
            textTransform: "uppercase", letterSpacing: 1 }}>How long?</div>
          <div style={{ fontFamily: font.display, fontSize: 28,
            color: colors.accent }}>{duration} min</div>
        </div>
        <input type="range" min={5} max={120} value={duration}
          onChange={e => setDuration(+e.target.value)}
          style={{ width: "100%", accentColor: colors.accent }} />
        <div style={{ display: "flex", justifyContent: "space-between",
          fontSize: 11, color: colors.textSub, marginTop: 4 }}>
          <span>5 min</span><span>2 hours</span>
        </div>
      </Card>

      {/* Intensity */}
      <Card className="fade-up delay-2" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 10 }}>
          <div style={{ color: colors.textSub, fontSize: 11,
            textTransform: "uppercase", letterSpacing: 1 }}>Intensity</div>
          <div style={{ fontFamily: font.display, fontSize: 28,
            color: colors.accent }}>{intensity}/10</div>
        </div>
        <input type="range" min={1} max={10} value={intensity}
          onChange={e => setIntensity(+e.target.value)}
          style={{ width: "100%", accentColor: colors.accent }} />
        <div style={{ display: "flex", justifyContent: "space-between",
          fontSize: 11, color: colors.textSub, marginTop: 4 }}>
          <span>Easy 😌</span><span>Beast 💀</span>
        </div>
      </Card>

      {/* Mood */}
      <div className="fade-up delay-3">
        <MoodPicker mood={mood} setMood={setMood} label="How do you feel NOW?" />
      </div>

      {mood !== null && !playlist && (
        <Card className="fade-up" style={{ marginBottom: 16,
          border: `1px solid ${colors.accent}55`,
          background: "linear-gradient(135deg,#0a1a18,#13131a)" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ color: colors.textSub, fontSize: 11,
                textTransform: "uppercase", letterSpacing: 1 }}>Mood Shift</div>
              <div style={{ fontFamily: font.display, fontSize: 32,
                color: colors.accent }}>😴 → {moods[mood]}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: colors.textSub, fontSize: 11 }}>lift</div>
              <div style={{ fontFamily: font.display, fontSize: 32,
                color: colors.accent }}>+{mood} pts</div>
            </div>
          </div>
          {error && <div style={{ color: colors.warn, fontSize: 13,
            marginBottom: 10 }}>{error}</div>}
          <button onClick={handleGenerate} disabled={loading} style={{
            width: "100%", padding: "16px", background: colors.accent,
            color: "#0a0a0f", border: "none", borderRadius: 14,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: font.display, fontSize: 22, letterSpacing: 1,
            opacity: loading ? 0.75 : 1,
          }}>
            {loading ? "🎵 AI IS THINKING..." : "🎵 GET COOLDOWN PLAYLIST"}
          </button>
          {loading && (
            <div style={{ textAlign: "center", color: colors.textSub,
              fontSize: 12, marginTop: 10 }}>
              Building your recovery mix...
            </div>
          )}
        </Card>
      )}

      {playlist && (
        <PlaylistCard
          playlist={playlist}
          activity="Cooldown"
          duration={duration}
          phase="post"
          onSave={onSave}
          saved={isSaved}
          onNext={() => setScreen("history")}
          nextLabel="VIEW MY HISTORY →"
        />
      )}
    </div>
  );
}

// ==============================
// SCREEN 4 — SAVED PLAYLISTS
// ==============================
function SavedScreen({ savedPlaylists, onDelete }) {
  const [expanded, setExpanded] = useState(null);

  if (savedPlaylists.length === 0) {
    return (
      <div style={{ padding: "8px 20px 0" }}>
        <div className="fade-up" style={{ marginBottom: 20 }}>
          <div style={{ color: colors.textSub, fontSize: 12,
            textTransform: "uppercase", letterSpacing: 1 }}>Your Library</div>
          <div style={{ fontFamily: font.display, fontSize: 36, lineHeight: 1.1 }}>
            SAVED<br/>PLAYLISTS
          </div>
        </div>
        <Card style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
          <div style={{ fontFamily: font.display, fontSize: 22,
            marginBottom: 8 }}>NO PLAYLISTS YET</div>
          <div style={{ color: colors.textSub, fontSize: 13 }}>
            Generate a playlist in the Start or Log screen and tap 💾 Save to add it here.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 20px 0" }}>
      <div className="fade-up" style={{ marginBottom: 20 }}>
        <div style={{ color: colors.textSub, fontSize: 12,
          textTransform: "uppercase", letterSpacing: 1 }}>Your Library</div>
        <div style={{ fontFamily: font.display, fontSize: 36, lineHeight: 1.1 }}>
          SAVED<br/>PLAYLISTS
        </div>
        <div style={{ color: colors.textSub, fontSize: 13, marginTop: 4 }}>
          {savedPlaylists.length} playlist{savedPlaylists.length !== 1 ? "s" : ""} saved
        </div>
      </div>

      {[...savedPlaylists].reverse().map((item, i) => {
        const isOpen  = expanded === i;
        const estMins = Math.round(item.playlist.songs.length * AVG_SONG_MINUTES);

        return (
          <Card key={i} className="fade-up" style={{ marginBottom: 12,
            border: isOpen ? `1px solid ${colors.accent}55` : `1px solid ${colors.cardBorder}`,
            transition: "border 0.2s" }}>

            {/* Collapsed header — tap to expand */}
            <div onClick={() => setExpanded(isOpen ? null : i)}
              style={{ cursor: "pointer", display: "flex",
                alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 28 }}>
                {item.phase === "pre" ? "⚡" : "🌊"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: font.display, fontSize: 18 }}>
                  {item.playlist.title}
                </div>
                <div style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }}>
                  {item.activity} · {item.playlist.songs.length} songs · ~{estMins} min · {item.date}
                </div>
              </div>
              <span style={{ color: colors.accent, fontSize: 18,
                transition: "transform 0.2s",
                transform: isOpen ? "rotate(90deg)" : "none" }}>›</span>
            </div>

            {/* Expanded: song list + export + delete */}
            {isOpen && (
              <div style={{ marginTop: 14 }}>
                <div style={{ color: colors.textSub, fontSize: 12,
                  marginBottom: 8 }}>{item.playlist.vibe}</div>

                {item.playlist.songs.map((s, j) => (
                  <a key={j} href={spotifySearchUrl(s)}
                    target="_blank" rel="noreferrer"
                    style={{ textDecoration: "none", color: "inherit",
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 0", borderBottom: `1px solid ${colors.muted}` }}>
                    <span style={{ color: colors.accent,
                      fontFamily: font.display, fontSize: 13,
                      width: 18 }}>{j + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.title}</div>
                      <div style={{ fontSize: 11, color: colors.textSub }}>{s.artist}</div>
                    </div>
                    <span style={{ color: colors.spotify, fontSize: 13 }}>♫</span>
                  </a>
                ))}

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <a href={spotifyPlaylistUrl(item.playlist)}
                    target="_blank" rel="noreferrer" style={{
                      flex: 1, padding: "10px 8px", borderRadius: 12,
                      background: colors.spotify, color: "#fff",
                      textDecoration: "none", textAlign: "center",
                      fontFamily: font.body, fontSize: 12, fontWeight: 600,
                    }}>🎵 Spotify</a>
                  <a href={appleMusicUrl(item.playlist)}
                    target="_blank" rel="noreferrer" style={{
                      flex: 1, padding: "10px 8px", borderRadius: 12,
                      background: colors.apple, color: "#fff",
                      textDecoration: "none", textAlign: "center",
                      fontFamily: font.body, fontSize: 12, fontWeight: 600,
                    }}>🍎 Apple</a>
                  <button onClick={() => { onDelete(savedPlaylists.length - 1 - i); setExpanded(null); }}
                    style={{
                      padding: "10px 14px", borderRadius: 12,
                      background: colors.muted, color: colors.textSub,
                      border: "none", cursor: "pointer",
                      fontFamily: font.body, fontSize: 12,
                    }}>🗑 Delete</button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ==============================
// SCREEN 5 — HISTORY
// ==============================
const historyData = [
  { day: "Mon", activity: "🏃 Run",   dur: 32, pre: 1, post: 4 },
  { day: "Tue", activity: "🏋️ Gym",   dur: 55, pre: 2, post: 4 },
  { day: "Wed", activity: "🚴 Ride",  dur: 45, pre: 3, post: 4 },
  { day: "Thu", activity: "🏀 Sport", dur: 60, pre: 2, post: 3 },
  { day: "Fri", activity: "🏋️ Gym",   dur: 50, pre: 1, post: 4 },
  { day: "Sat", activity: "🏃 Run",   dur: 40, pre: 2, post: 4 },
];

function HistoryScreen() {
  return (
    <div style={{ padding: "8px 20px 0" }}>
      <div className="fade-up" style={{ marginBottom: 20 }}>
        <div style={{ color: colors.textSub, fontSize: 12,
          textTransform: "uppercase", letterSpacing: 1 }}>Your Progress</div>
        <div style={{ fontFamily: font.display, fontSize: 36, lineHeight: 1.1 }}>
          HISTORY &<br/>INSIGHTS
        </div>
      </div>

      <Card className="fade-up delay-1" style={{ marginBottom: 16 }}>
        <div style={{ color: colors.textSub, fontSize: 11,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
          Mood Before vs After 📊</div>
        <div style={{ display: "flex", alignItems: "flex-end",
          justifyContent: "space-between", height: 100, gap: 6 }}>
          {historyData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex",
              flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: "100%", display: "flex",
                alignItems: "flex-end", justifyContent: "center",
                gap: 2, height: 80 }}>
                <div style={{ width: "40%", height: `${(d.pre / 4) * 80}px`,
                  background: colors.muted, borderRadius: "4px 4px 0 0" }} />
                <div style={{ width: "40%", height: `${(d.post / 4) * 80}px`,
                  background: colors.accent, borderRadius: "4px 4px 0 0" }} />
              </div>
              <div style={{ fontSize: 10, color: colors.textSub }}>{d.day}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          {[["Before", colors.muted], ["After", colors.accent]].map(([l, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
              <span style={{ fontSize: 11, color: colors.textSub }}>{l}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="fade-up delay-2" style={{ marginBottom: 16 }}>
        <div style={{ color: colors.textSub, fontSize: 11,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          This Week's Sessions</div>
        {historyData.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center",
            gap: 12, padding: "10px 0",
            borderBottom: i < historyData.length - 1
              ? `1px solid ${colors.muted}` : "none" }}>
            <div style={{ fontSize: 22 }}>{d.activity.split(" ")[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {d.activity.split(" ").slice(1).join(" ")} · {d.dur} min
              </div>
              <div style={{ fontSize: 11, color: colors.textSub }}>
                {d.day} · Mood {moods[d.pre]} → {moods[d.post]}
              </div>
            </div>
            <div style={{ fontFamily: font.display, fontSize: 18,
              color: colors.accent }}>+{d.post - d.pre}</div>
          </div>
        ))}
      </Card>

      <Card className="fade-up delay-3" style={{
        border: `1px solid ${colors.accent}44`,
        background: "linear-gradient(135deg,#0a1a18,#13131a)" }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🧠</div>
        <div style={{ fontFamily: font.display, fontSize: 20, marginBottom: 6 }}>
          WORKOUT = MOOD BOOST</div>
        <div style={{ color: colors.textSub, fontSize: 13, lineHeight: 1.6 }}>
          Your mood improves by an average of{" "}
          <span style={{ color: colors.accent, fontWeight: 600 }}>+2.3 pts</span>{" "}
          after every session this week. Your best days start with a workout.
        </div>
      </Card>
    </div>
  );
}

// ==============================
// ROOT APP — manages saved playlists state
// ==============================
export default function App() {
  const [screen, setScreen] = useState("home");

  // savedPlaylists lives here so ALL screens can read and write it
  const [savedPlaylists, setSavedPlaylists] = useState([]);

  // Save a playlist — called from PlaylistCard's 💾 button
  function handleSave(playlist, meta) {
    const entry = {
      playlist,
      activity: meta.activity || "Workout",
      phase: meta.phase,
      duration: meta.duration,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
    setSavedPlaylists(prev => [...prev, entry]);
  }

  // Delete a saved playlist by index
  function handleDelete(index) {
    setSavedPlaylists(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <>
      <style>{gStyle}</style>
      <div style={{ minHeight: "100vh", background: "#050508",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, flexDirection: "column", gap: 24 }}>
        <div style={{ color: "#ffffff33", fontSize: 12,
          fontFamily: "DM Sans, sans-serif", letterSpacing: 1 }}>
          PULSEPLAY — INTERACTIVE MOCKUP
        </div>
        <div style={{ position: "relative" }}>
          <Phone>
            {screen === "home"    && <HomeScreen    setScreen={setScreen} savedPlaylists={savedPlaylists} />}
            {screen === "pre"     && <PreScreen     setScreen={setScreen} onSave={handleSave} savedPlaylists={savedPlaylists} />}
            {screen === "post"    && <PostScreen    setScreen={setScreen} onSave={handleSave} savedPlaylists={savedPlaylists} />}
            {screen === "saved"   && <SavedScreen   savedPlaylists={savedPlaylists} onDelete={handleDelete} />}
            {screen === "history" && <HistoryScreen />}
          </Phone>
          <Nav screen={screen} setScreen={setScreen} />
        </div>
        <div style={{ color: "#ffffff22", fontSize: 11,
          fontFamily: "DM Sans, sans-serif", textAlign: "center" }}>
          Tap the nav bar · Generate a playlist · Hit 💾 to save it
        </div>
      </div>
    </>
  );
}
