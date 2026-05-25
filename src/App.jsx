import { useState, useEffect } from "react";

// ---- Design system — Rose theme ----
const colors = {
  pink:       "#f48fb1",
  pinkDim:    "#f48fb1cc",
  purple:     "#ce93d8",
  purpleDim:  "#ce93d8cc",
  accent:     "#f48fb1",
  accentDim:  "#f48fb1cc",
  bg:         "#0f0508",
  card:       "#1a0a12",
  cardBorder: "#2e1020",
  text:       "#fff0f5",
  textSub:    "#a07080",
  muted:      "#3a1828",
  warn:       "#f5a623",
  spotify:    "#1DB954",
  apple:      "#fc3c44",
};

const font = {
  display: "'Bebas Neue', sans-serif",
  body:    "'DM Sans', sans-serif",
};

const gStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${colors.bg}; font-family: ${font.body}; color: ${colors.text}; }
  #root { padding-top: env(safe-area-inset-top); }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulsePink {
    0%, 100% { box-shadow: 0 0 0 0 ${colors.pink}55; }
    50%       { box-shadow: 0 0 0 14px ${colors.pink}00; }
  }
  @keyframes pulsePurple {
    0%, 100% { box-shadow: 0 0 0 0 ${colors.purple}55; }
    50%       { box-shadow: 0 0 0 14px ${colors.purple}00; }
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
const moodLabels = ["Tired","Meh","OK","Pumped","ON FIRE"];
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
function youtubeMusicUrl(playlist) {
  const q = encodeURIComponent(`${playlist.title} ${playlist.songs[0]?.artist || ""}`);
  return `https://music.youtube.com/search?q=${q}`;
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

// ---- Nav icons as inline SVG so they match the Rose pink exactly ----
function NavIcon({ id, active, color }) {
  const c = active ? color : colors.textSub;
  const size = 22;
  if (id === "home") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
        stroke={c} strokeWidth="2" strokeLinejoin="round" fill={active ? c+"33" : "none"}/>
    </svg>
  );
  if (id === "pre") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 18V6L20 12L9 18Z" stroke={c} strokeWidth="2"
        strokeLinejoin="round" fill={active ? c+"33" : "none"}/>
      <line x1="5" y1="6" x2="5" y2="18" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
  if (id === "post") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        stroke={c} strokeWidth="2" strokeLinejoin="round" fill={active ? c+"33" : "none"}/>
    </svg>
  );
  if (id === "saved") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 21C12 21 3 14 3 8C3 5.24 5.24 3 8 3C9.64 3 11.09 3.8 12 5.02C12.91 3.8 14.36 3 16 3C18.76 3 21 5.24 21 8C21 14 12 21 12 21Z"
        stroke={c} strokeWidth="2" strokeLinejoin="round" fill={active ? c+"33" : "none"}/>
    </svg>
  );
  if (id === "history") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3"  y="14" width="4" height="7" rx="1" fill={c}/>
      <rect x="10" y="9"  width="4" height="12" rx="1" fill={c}/>
      <rect x="17" y="4"  width="4" height="17" rx="1" fill={c}/>
    </svg>
  );
  return null;
}

function Nav({ screen, setScreen }) {
  const items = [
    { id: "home",    label: "Home",    color: colors.pink   },
    { id: "pre",     label: "Start",   color: colors.pink   },
    { id: "post",    label: "After",   color: colors.pink   },
    { id: "saved",   label: "Saved",   color: colors.pink   },
    { id: "history", label: "History", color: colors.pink   },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 80,
      background: colors.card, borderTop: `1px solid ${colors.cardBorder}`,
      display: "flex", alignItems: "center", justifyContent: "space-around",
      padding: "0 4px 8px", zIndex: 100,
    }}>
      {items.map(it => (
        <button key={it.id} onClick={() => setScreen(it.id)} style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 3, color: screen === it.id ? it.color : colors.textSub,
          fontFamily: font.body, fontSize: 10, fontWeight: 500,
          transition: "color 0.2s",
        }}>
          <NavIcon id={it.id} active={screen === it.id} color={it.color} />
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

function BigButton({ label, onClick, sub, color }) {
  const c = color || colors.pink;
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "18px 24px",
      background: c, color: "#0a0a0f",
      border: "none", borderRadius: 20, cursor: "pointer",
      fontFamily: font.display, fontSize: 26, letterSpacing: 1,
      animation: c === colors.purple ? "pulsePurple 2.4s infinite" : "pulsePink 2.4s infinite",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    }}>
      {label}
      {sub && <span style={{ fontFamily: font.body, fontSize: 12,
        fontWeight: 500, color: "#0a0a0f99" }}>{sub}</span>}
    </button>
  );
}

// ---- MoodPicker (reused in Pre and Post) ----
function MoodPicker({ mood, setMood, label = "How are you feeling?", color }) {
  const c = color || colors.pink;
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
            background: mood === i ? c + "22" : "none",
            border: mood === i ? `2px solid ${c}` : `2px solid ${colors.muted}`,
            borderRadius: 14, padding: "10px 4px", cursor: "pointer",
            transition: "all 0.15s", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <span style={{ fontSize: 24 }}>{m}</span>
            <span style={{ fontSize: 9, fontFamily: font.body,
              color: mood === i ? c : colors.textSub }}>
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
  const c = phase === "post" ? colors.purple : colors.pink;

  function handleSave() {
    onSave(playlist, { activity, duration, phase });
    setJustSaved(true);
  }

  const songCount = playlist.songs.length;
  const estMins   = Math.round(songCount * AVG_SONG_MINUTES);

  return (
    <Card className="fade-up" style={{
      border: `1px solid ${c}66`,
      background: `linear-gradient(135deg, ${phase === "post" ? "#0d0a1a" : "#1a0a0f"}, #13131a)`,
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <div style={{ color: c, fontSize: 11,
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            ✨ AI Playlist · {songCount} songs · ~{estMins} min
          </div>
          <div style={{ fontFamily: font.display, fontSize: 22 }}>
            {playlist.title}
          </div>
        </div>
        <button onClick={handleSave} disabled={saved || justSaved} style={{
          background: saved || justSaved ? colors.muted : c,
          color: saved || justSaved ? colors.textSub : "#0a0a0f",
          border: "none", borderRadius: 10, padding: "6px 12px",
          fontFamily: font.body, fontSize: 11, fontWeight: 600,
          cursor: saved || justSaved ? "default" : "pointer",
          transition: "all 0.2s", whiteSpace: "nowrap", marginLeft: 8,
        }}>
          {saved || justSaved
            ? "✓ Saved"
            : <><span style={{ color: colors.pink, fontSize: 13 }}>♥</span> Save</>
          }
        </button>
      </div>
      <div style={{ color: colors.textSub, fontSize: 13, marginBottom: 14 }}>
        {playlist.vibe}
      </div>

      {playlist.songs.map((s, i) => (
        <a key={i} href={spotifySearchUrl(s)} target="_blank" rel="noreferrer"
          style={{ textDecoration: "none", display: "flex", alignItems: "center",
            gap: 10, padding: "9px 0", borderBottom: `1px solid ${colors.muted}`,
            color: "inherit" }}>
          <span style={{ color: c, fontFamily: font.display,
            fontSize: 14, width: 18 }}>{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{s.title}</div>
            <div style={{ fontSize: 11, color: colors.textSub }}>{s.artist}</div>
          </div>
          <span style={{ fontSize: 14, color: colors.spotify }}>♫</span>
        </a>
      ))}

      <div style={{ fontSize: 11, color: colors.textSub,
        textAlign: "center", margin: "12px 0 8px" }}>
        Tap any song to search on Spotify, or open the full playlist:
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <a href={spotifyPlaylistUrl(playlist)} target="_blank" rel="noreferrer"
          style={{
            flex: 1, padding: "12px 4px", borderRadius: 12,
            background: colors.spotify, color: "#fff", textDecoration: "none",
            textAlign: "center", fontFamily: font.body,
            fontSize: 11, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}>🎵 Spotify</a>
        <a href={appleMusicUrl(playlist)} target="_blank" rel="noreferrer"
          style={{
            flex: 1, padding: "12px 4px", borderRadius: 12,
            background: colors.apple, color: "#fff", textDecoration: "none",
            textAlign: "center", fontFamily: font.body,
            fontSize: 11, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}>🍎 Apple</a>
        <a href={youtubeMusicUrl(playlist)} target="_blank" rel="noreferrer"
          style={{
            flex: 1, padding: "12px 4px", borderRadius: 12,
            background: "#ff0000", color: "#fff", textDecoration: "none",
            textAlign: "center", fontFamily: font.body,
            fontSize: 11, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}>▶ YT Music</a>
      </div>

      {onNext && (
        <button onClick={onNext} style={{
          width: "100%", marginTop: 10, padding: "14px",
          background: c, color: "#0a0a0f",
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
function HomeScreen({ setScreen, savedPlaylists, profile }) {
  const lastSaved  = savedPlaylists[savedPlaylists.length - 1];
  const totalSaved = savedPlaylists.length;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric"
  });
  const greeting = profile.name ? `Hey, ${profile.name} 👋` : "TEMPO";

  return (
    <div style={{ padding: "8px 20px 0" }}>
      <div className="fade-up" style={{ display: "flex",
        justifyContent: "space-between", alignItems: "center",
        marginBottom: 24, marginTop: 4 }}>
        <div>
          <div style={{ color: colors.textSub, fontSize: 13, marginTop: 2 }}>
            {today}
          </div>
        </div>
        {/* Functional profile button */}
        <button onClick={() => setScreen("profile")} style={{
          width: 42, height: 42, borderRadius: "50%",
          background: colors.pink + "33",
          border: `2px solid ${colors.pink}55`,
          display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 18,
          cursor: "pointer", color: colors.pink,
          fontFamily: font.display, letterSpacing: 1,
          fontWeight: 700,
        }}>
          {profile.name ? profile.name[0].toUpperCase() : "👤"}
        </button>
      </div>

      <div className="fade-up delay-1" style={{ marginBottom: 16 }}>
        <BigButton label="START SESSION"
          sub="Check in + get your AI playlist"
          onClick={() => setScreen("pre")} color={colors.pink} />
      </div>

      {/* Real stats */}
      <Card className="fade-up delay-2" style={{ marginBottom: 16 }}>
        <div style={{ color: colors.textSub, fontSize: 11,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
          Your Stats</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[
            { label: "Pre",       val: String(savedPlaylists.filter(s => s.phase === "pre").length),  unit: "workouts"  },
            { label: "Post",      val: String(savedPlaylists.filter(s => s.phase === "post").length), unit: "cooldowns" },
            { label: "Playlists", val: String(totalSaved), unit: "saved" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: font.display, fontSize: 28,
                color: colors.pink }}>{s.val}</div>
              <div style={{ fontSize: 11, color: colors.textSub }}>{s.label}</div>
              <div style={{ fontSize: 10, color: colors.muted }}>{s.unit}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Last saved playlist */}
      {lastSaved ? (
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
            <span style={{ color: colors.pink }}>→</span>
          </div>
        </Card>
      ) : (
        <Card className="fade-up delay-3" style={{ marginBottom: 16,
          textAlign: "center", padding: "28px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🎵</div>
          <div style={{ fontFamily: font.display, fontSize: 20, marginBottom: 6 }}>
            NO SESSIONS YET</div>
          <div style={{ color: colors.textSub, fontSize: 13 }}>
            Tap Start Session to log your first workout and get a playlist!
          </div>
        </Card>
      )}
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
      <div className="fade-up" style={{ display: "flex",
        alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setScreen("home")} style={{
          background: "none", border: "none", cursor: "pointer",
          color: colors.pink, fontSize: 22, padding: 0,
        }}>←</button>
        <div>
          <div style={{ color: colors.textSub, fontSize: 12,
            textTransform: "uppercase", letterSpacing: 1 }}>Step 1 of 2</div>
          <div style={{ fontFamily: font.display, fontSize: 36, lineHeight: 1.1 }}>
            PRE-WORKOUT<br/>CHECK-IN
          </div>
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
              background: activity === i ? colors.pink : colors.muted,
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
              color: colors.pink }}>{duration} min</span>
            <span style={{ color: colors.textSub, fontSize: 12,
              marginLeft: 6 }}>~{Math.round(duration / AVG_SONG_MINUTES)} songs</span>
          </div>
        </div>
        <input type="range" min={10} max={120} step={5} value={duration}
          onChange={e => setDuration(+e.target.value)}
          style={{ width: "100%", accentColor: colors.pink }} />
        <div style={{ display: "flex", justifyContent: "space-between",
          fontSize: 11, color: colors.textSub, marginTop: 4 }}>
          <span>10 min</span><span>2 hours</span>
        </div>
      </Card>

      {/* Mood */}
      <div className="fade-up delay-3">
        <MoodPicker mood={mood} setMood={setMood} label="How are you feeling?" color={colors.pink} />
      </div>

      {error && <div style={{ color: colors.warn, fontSize: 13,
        textAlign: "center", marginBottom: 12 }}>{error}</div>}

      {!playlist && (
        <div className="fade-up delay-4">
          <button onClick={handleGenerate} disabled={!canGenerate || loading} style={{
            width: "100%", padding: "18px",
            background: canGenerate ? colors.pink : colors.muted,
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
      <div className="fade-up" style={{ display: "flex",
        alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setScreen("home")} style={{
          background: "none", border: "none", cursor: "pointer",
          color: colors.purple, fontSize: 22, padding: 0,
        }}>←</button>
        <div>
          <div style={{ color: colors.purple, fontSize: 12,
            textTransform: "uppercase", letterSpacing: 1 }}>Nice work! 💪</div>
          <div style={{ fontFamily: font.display, fontSize: 36, lineHeight: 1.1 }}>
            POST-WORKOUT<br/>LOG
          </div>
        </div>
      </div>

      {/* Duration */}
      <Card className="fade-up delay-1" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 10 }}>
          <div style={{ color: colors.textSub, fontSize: 11,
            textTransform: "uppercase", letterSpacing: 1 }}>How long?</div>
          <div style={{ fontFamily: font.display, fontSize: 28,
            color: colors.purple }}>{duration} min</div>
        </div>
        <input type="range" min={5} max={120} value={duration}
          onChange={e => setDuration(+e.target.value)}
          style={{ width: "100%", accentColor: colors.purple }} />
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
            color: colors.purple }}>{intensity}/10</div>
        </div>
        <input type="range" min={1} max={10} value={intensity}
          onChange={e => setIntensity(+e.target.value)}
          style={{ width: "100%", accentColor: colors.purple }} />
        <div style={{ display: "flex", justifyContent: "space-between",
          fontSize: 11, color: colors.textSub, marginTop: 4 }}>
          <span>Easy 😌</span><span>Beast 💀</span>
        </div>
      </Card>

      {/* Mood */}
      <div className="fade-up delay-3">
        <MoodPicker mood={mood} setMood={setMood} label="How do you feel NOW?" color={colors.purple} />
      </div>

      {mood !== null && !playlist && (
        <Card className="fade-up" style={{ marginBottom: 16,
          border: `1px solid ${colors.purple}55`,
          background: "linear-gradient(135deg,#0a1a18,#13131a)" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ color: colors.textSub, fontSize: 11,
                textTransform: "uppercase", letterSpacing: 1 }}>Mood Shift</div>
              <div style={{ fontFamily: font.display, fontSize: 32,
                color: colors.purple }}>😴 → {moods[mood]}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: colors.textSub, fontSize: 11 }}>lift</div>
              <div style={{ fontFamily: font.display, fontSize: 32,
                color: colors.purple }}>+{mood} pts</div>
            </div>
          </div>
          {error && <div style={{ color: colors.warn, fontSize: 13,
            marginBottom: 10 }}>{error}</div>}
          <button onClick={handleGenerate} disabled={loading} style={{
            width: "100%", padding: "16px", background: colors.purple,
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
function SavedScreen({ savedPlaylists, onDelete, onRename }) {
  const [expanded, setExpanded] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");

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
            Generate a playlist in the Start or Log screen and tap ♥ Save to add it here.
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
            border: isOpen ? `1px solid ${colors.pink}55` : `1px solid ${colors.cardBorder}`,
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
              <span style={{ color: colors.pink, fontSize: 18,
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
                    <span style={{ color: colors.pink,
                      fontFamily: font.display, fontSize: 13,
                      width: 18 }}>{j + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.title}</div>
                      <div style={{ fontSize: 11, color: colors.textSub }}>{s.artist}</div>
                    </div>
                    <span style={{ color: colors.spotify, fontSize: 13 }}>♫</span>
                  </a>
                ))}

                {/* Rename inline */}
                {renaming === i ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <input
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      style={{
                        flex: 1, background: colors.muted,
                        border: `1px solid ${colors.pink}`,
                        borderRadius: 10, padding: "10px 12px",
                        color: colors.text, fontFamily: font.body,
                        fontSize: 13, outline: "none",
                      }}
                      autoFocus
                    />
                    <button onClick={() => {
                      onRename(savedPlaylists.length - 1 - i, renameVal.trim().toUpperCase());
                      setRenaming(null);
                    }} style={{
                      padding: "10px 14px", borderRadius: 10,
                      background: colors.pink, color: "#0f0508",
                      border: "none", cursor: "pointer",
                      fontFamily: font.body, fontSize: 12, fontWeight: 600,
                    }}>Save</button>
                    <button onClick={() => setRenaming(null)} style={{
                      padding: "10px 14px", borderRadius: 10,
                      background: colors.muted, color: colors.textSub,
                      border: "none", cursor: "pointer",
                      fontFamily: font.body, fontSize: 12,
                    }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <a href={spotifyPlaylistUrl(item.playlist)}
                      target="_blank" rel="noreferrer" style={{
                        flex: 1, padding: "10px 4px", borderRadius: 12,
                        background: colors.spotify, color: "#fff",
                        textDecoration: "none", textAlign: "center",
                        fontFamily: font.body, fontSize: 11, fontWeight: 600,
                      }}>🎵 Spotify</a>
                    <a href={appleMusicUrl(item.playlist)}
                      target="_blank" rel="noreferrer" style={{
                        flex: 1, padding: "10px 4px", borderRadius: 12,
                        background: colors.apple, color: "#fff",
                        textDecoration: "none", textAlign: "center",
                        fontFamily: font.body, fontSize: 11, fontWeight: 600,
                      }}>🍎 Apple</a>
                    <a href={youtubeMusicUrl(item.playlist)}
                      target="_blank" rel="noreferrer" style={{
                        flex: 1, padding: "10px 4px", borderRadius: 12,
                        background: "#ff0000", color: "#fff",
                        textDecoration: "none", textAlign: "center",
                        fontFamily: font.body, fontSize: 11, fontWeight: 600,
                      }}>▶ YT</a>
                    <button onClick={() => { setRenaming(i); setRenameVal(item.playlist.title); }}
                      style={{
                        padding: "10px 10px", borderRadius: 12,
                        background: colors.muted, color: colors.pink,
                        border: "none", cursor: "pointer",
                        fontFamily: font.body, fontSize: 13,
                      }}>✏️</button>
                    <button onClick={() => { onDelete(savedPlaylists.length - 1 - i); setExpanded(null); }}
                      style={{
                        padding: "10px 10px", borderRadius: 12,
                        background: colors.muted, color: colors.textSub,
                        border: "none", cursor: "pointer",
                        fontFamily: font.body, fontSize: 13,
                      }}>🗑</button>
                  </div>
                )}
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
function HistoryScreen({ savedPlaylists }) {
  if (savedPlaylists.length === 0) {
    return (
      <div style={{ padding: "8px 20px 0" }}>
        <div className="fade-up" style={{ marginBottom: 20 }}>
          <div style={{ color: colors.textSub, fontSize: 12,
            textTransform: "uppercase", letterSpacing: 1 }}>Your Progress</div>
          <div style={{ fontFamily: font.display, fontSize: 36, lineHeight: 1.1 }}>
            HISTORY &<br/>INSIGHTS
          </div>
        </div>
        <Card style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
          <div style={{ fontFamily: font.display, fontSize: 22, marginBottom: 8 }}>
            NO DATA YET</div>
          <div style={{ color: colors.textSub, fontSize: 13 }}>
            Complete a session and save a playlist to start seeing your history here.
          </div>
        </Card>
      </div>
    );
  }

  // Build mood data from saved playlists
  const preSessions  = savedPlaylists.filter(s => s.phase === "pre");
  const postSessions = savedPlaylists.filter(s => s.phase === "post");

  return (
    <div style={{ padding: "8px 20px 0" }}>
      <div className="fade-up" style={{ marginBottom: 20 }}>
        <div style={{ color: colors.textSub, fontSize: 12,
          textTransform: "uppercase", letterSpacing: 1 }}>Your Progress</div>
        <div style={{ fontFamily: font.display, fontSize: 36, lineHeight: 1.1 }}>
          HISTORY &<br/>INSIGHTS
        </div>
      </div>

      {/* Summary stats */}
      <Card className="fade-up delay-1" style={{ marginBottom: 16 }}>
        <div style={{ color: colors.textSub, fontSize: 11,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
          All Time</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[
            { label: "Workouts",   val: String(preSessions.length),              unit: "sessions"   },
            { label: "Cooldowns",  val: String(postSessions.length),             unit: "sessions"   },
            { label: "Total",      val: String(savedPlaylists.length),           unit: "playlists"  },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: font.display, fontSize: 28,
                color: colors.purple }}>{s.val}</div>
              <div style={{ fontSize: 11, color: colors.textSub }}>{s.label}</div>
              <div style={{ fontSize: 10, color: colors.muted }}>{s.unit}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Session log */}
      <Card className="fade-up delay-2" style={{ marginBottom: 16 }}>
        <div style={{ color: colors.textSub, fontSize: 11,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          Session Log</div>
        {[...savedPlaylists].reverse().map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center",
            gap: 12, padding: "10px 0",
            borderBottom: i < savedPlaylists.length - 1
              ? `1px solid ${colors.muted}` : "none" }}>
            <div style={{ fontSize: 22 }}>
              {s.phase === "pre" ? "⚡" : "🌊"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {s.playlist.title}
              </div>
              <div style={{ fontSize: 11, color: colors.textSub }}>
                {s.activity} · {s.playlist.songs.length} songs · {s.date}
              </div>
            </div>
            <div style={{ fontFamily: font.display, fontSize: 14,
              color: s.phase === "pre" ? colors.pink : colors.purple }}>
              {s.phase === "pre" ? "PRE" : "POST"}
            </div>
          </div>
        ))}
      </Card>

      {/* Insight card */}
      <Card className="fade-up delay-3" style={{
        border: `1px solid ${colors.purple}44`,
        background: "linear-gradient(135deg, #1a0a12, #13131a)" }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🧠</div>
        <div style={{ fontFamily: font.display, fontSize: 20, marginBottom: 6 }}>
          KEEP IT UP</div>
        <div style={{ color: colors.textSub, fontSize: 13, lineHeight: 1.6 }}>
          You've logged{" "}
          <span style={{ color: colors.purple, fontWeight: 600 }}>
            {savedPlaylists.length} playlist{savedPlaylists.length !== 1 ? "s" : ""}
          </span>{" "}
          so far. Every session counts — keep going!
        </div>
      </Card>
    </div>
  );
}

// ==============================
// SCREEN 6 — PROFILE
// ==============================
function ProfileScreen({ setScreen, profile, setProfile, savedPlaylists, onClearAll }) {
  const [name,     setName]     = useState(profile.name || "");
  const [goal,     setGoal]     = useState(profile.goal || "");
  const [saved,    setSaved]    = useState(false);
  const [clearing, setClearing] = useState(false);

  function handleSave() {
    setProfile({ name: name.trim(), goal: goal.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const goals = ["Build strength 💪", "Lose weight 🔥", "Run faster 🏃", "Stay active 🧘", "Train for sport ⚽", "Just vibe 🎵"];

  return (
    <div style={{ padding: "16px 20px 0" }}>
      <div className="fade-up" style={{ display: "flex",
        alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setScreen("home")} style={{
          background: "none", border: "none", cursor: "pointer",
          color: colors.pink, fontSize: 22, padding: 0,
        }}>←</button>
        <div>
          <div style={{ color: colors.textSub, fontSize: 12,
            textTransform: "uppercase", letterSpacing: 1 }}>Your Account</div>
          <div style={{ fontFamily: font.display, fontSize: 32, lineHeight: 1.1 }}>
            PROFILE
          </div>
        </div>
      </div>

      {/* Avatar initial */}
      <div className="fade-up" style={{ display: "flex",
        justifyContent: "center", marginBottom: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%",
          background: colors.pink + "33", border: `3px solid ${colors.pink}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: font.display, fontSize: 36, color: colors.pink }}>
          {name ? name[0].toUpperCase() : "?"}
        </div>
      </div>

      {/* Name input */}
      <Card className="fade-up delay-1" style={{ marginBottom: 12 }}>
        <div style={{ color: colors.textSub, fontSize: 11,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          Your Name</div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter your name..."
          style={{
            width: "100%", background: colors.muted,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 12, padding: "12px 14px",
            color: colors.text, fontFamily: font.body,
            fontSize: 15, outline: "none",
          }}
        />
      </Card>

      {/* Fitness goal */}
      <Card className="fade-up delay-2" style={{ marginBottom: 12 }}>
        <div style={{ color: colors.textSub, fontSize: 11,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          My Goal</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {goals.map((g, i) => (
            <button key={i} onClick={() => setGoal(g)} style={{
              background: goal === g ? colors.pink + "22" : "none",
              border: goal === g ? `2px solid ${colors.pink}` : `2px solid ${colors.cardBorder}`,
              borderRadius: 12, padding: "10px 8px", cursor: "pointer",
              fontFamily: font.body, fontSize: 12,
              color: goal === g ? colors.pink : colors.textSub,
              transition: "all 0.15s", textAlign: "center",
            }}>{g}</button>
          ))}
        </div>
      </Card>

      {/* Stats summary */}
      <Card className="fade-up delay-3" style={{ marginBottom: 16 }}>
        <div style={{ color: colors.textSub, fontSize: 11,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
          Your Stats</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[
            { label: "Workouts",  val: String(savedPlaylists.filter(s => s.phase === "pre").length)  },
            { label: "Cooldowns", val: String(savedPlaylists.filter(s => s.phase === "post").length) },
            { label: "Playlists", val: String(savedPlaylists.length)                                 },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: font.display, fontSize: 28,
                color: colors.pink }}>{s.val}</div>
              <div style={{ fontSize: 11, color: colors.textSub }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Save button */}
      <button onClick={handleSave} style={{
        width: "100%", padding: "16px",
        background: saved ? colors.muted : colors.pink,
        color: "#0f0508", border: "none", borderRadius: 16,
        fontFamily: font.display, fontSize: 22, letterSpacing: 1,
        cursor: "pointer", marginBottom: 12, transition: "all 0.2s",
      }}>
        {saved ? "✓ SAVED!" : "SAVE PROFILE"}
      </button>

      {/* Clear all data */}
      {!clearing ? (
        <button onClick={() => setClearing(true)} style={{
          width: "100%", padding: "14px",
          background: "none", color: colors.textSub,
          border: `1px solid ${colors.muted}`, borderRadius: 16,
          fontFamily: font.body, fontSize: 13,
          cursor: "pointer", marginBottom: 16,
        }}>Clear all saved playlists</button>
      ) : (
        <Card style={{ marginBottom: 16, border: `1px solid ${colors.warn}44` }}>
          <div style={{ color: colors.warn, fontSize: 13,
            marginBottom: 12, textAlign: "center" }}>
            This will delete all your saved playlists. Are you sure?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setClearing(false)} style={{
              flex: 1, padding: "12px", background: colors.muted,
              color: colors.text, border: "none", borderRadius: 12,
              fontFamily: font.body, fontSize: 13, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={() => { onClearAll(); setClearing(false); }} style={{
              flex: 1, padding: "12px", background: colors.warn,
              color: "#0f0508", border: "none", borderRadius: 12,
              fontFamily: font.body, fontSize: 13, fontWeight: 600,
              cursor: "pointer",
            }}>Yes, clear all</button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ==============================
// ROOT APP
// ==============================
export default function App() {
  const [screen, setScreen] = useState("home");

  // Load savedPlaylists from localStorage so they survive app restarts
  const [savedPlaylists, setSavedPlaylists] = useState(() => {
    try {
      const stored = localStorage.getItem("tempo_playlists");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Load profile from localStorage
  const [profile, setProfileState] = useState(() => {
    try {
      const stored = localStorage.getItem("tempo_profile");
      return stored ? JSON.parse(stored) : { name: "", goal: "" };
    } catch { return { name: "", goal: "" }; }
  });

  // Auto-save playlists to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem("tempo_playlists", JSON.stringify(savedPlaylists)); }
    catch {}
  }, [savedPlaylists]);

  // Auto-save profile to localStorage whenever it changes
  function setProfile(p) {
    setProfileState(p);
    try { localStorage.setItem("tempo_profile", JSON.stringify(p)); }
    catch {}
  }

  function handleSave(playlist, meta) {
    const entry = {
      playlist,
      activity: meta.activity || "Workout",
      phase:    meta.phase,
      duration: meta.duration,
      date:     new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
    setSavedPlaylists(prev => [...prev, entry]);
  }

  function handleDelete(index) {
    setSavedPlaylists(prev => prev.filter((_, i) => i !== index));
  }

  function handleRename(index, newTitle) {
    setSavedPlaylists(prev => prev.map((item, i) =>
      i === index ? { ...item, playlist: { ...item.playlist, title: newTitle } } : item
    ));
  }

  function handleClearAll() { setSavedPlaylists([]); }

  return (
    <>
      <style>{gStyle}</style>
      <div style={{ minHeight: "100vh", background: colors.bg,
        display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 90 }}>
          {screen === "home"    && <HomeScreen    setScreen={setScreen} savedPlaylists={savedPlaylists} profile={profile} />}
          {screen === "pre"     && <PreScreen     setScreen={setScreen} onSave={handleSave} savedPlaylists={savedPlaylists} />}
          {screen === "post"    && <PostScreen    setScreen={setScreen} onSave={handleSave} savedPlaylists={savedPlaylists} />}
          {screen === "saved"   && <SavedScreen   savedPlaylists={savedPlaylists} onDelete={handleDelete} onRename={handleRename} />}
          {screen === "history" && <HistoryScreen savedPlaylists={savedPlaylists} />}
          {screen === "profile" && <ProfileScreen setScreen={setScreen} profile={profile} setProfile={setProfile} savedPlaylists={savedPlaylists} onClearAll={handleClearAll} />}
        </div>
        {screen !== "profile" && <Nav screen={screen} setScreen={setScreen} />}
      </div>
    </>
  );
}
