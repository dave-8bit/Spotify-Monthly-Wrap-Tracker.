import { useEffect, useState, useRef } from 'react';
import { sdk } from './spotify';
import type { UserProfile, Artist, Track } from '@spotify/web-api-ts-sdk';
import html2canvas from 'html2canvas';
import './App.css';

interface WrappedData {
  tracks: Track[];
  artists: Artist[];
  albums: { name: string; artist: string; image: string }[];
  genres: string[];
  minutes: number;
  mostPopularTrack: Track | null;
  averageTrackDuration: number;
  uniqueArtists: number;
  topGenreCount: number;
}

type TimePeriod = 'short_term';

interface TimePeriodConfig {
  key: TimePeriod;
  label: string;
  description: string;
}

const TIME_PERIODS: TimePeriodConfig[] = [
  { key: 'short_term', label: 'Last 60 Days', description: 'Last 60 days' }
];

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [data, setData] = useState<Record<TimePeriod, WrappedData | null>>({
    short_term: null
  });

  const [currentSlide, setCurrentSlide] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.has('code')) {
          console.log("🔵 OAuth redirect detected, completing authentication...");
          await sdk.authenticate();
          console.log("✅ Authentication complete");
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      }
    };

    const getStats = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("🔵 Fetching user profile...");
        const profile = await sdk.currentUser.profile();
        console.log("✅ Profile fetched:", profile);
        setUser(profile);

        const newData: Record<TimePeriod, WrappedData | null> = {
          short_term: null
        };

        const fetchPromises = TIME_PERIODS.map(async (period) => {
          try {
            console.log(`🔵 Fetching ${period.label} data...`);
            const topTracks = await sdk.currentUser.topItems("tracks", period.key, 50);
            console.log(`✅ Top tracks (${period.label}):`, topTracks?.items?.length, "items");
            const topArtists = await sdk.currentUser.topItems("artists", period.key, 50);
            console.log(`✅ Top artists (${period.label}):`, topArtists?.items?.length, "items");

            if (!topTracks?.items || !topArtists?.items) {
              throw new Error(`Failed to fetch data for ${period.label} - no items returned`);
            }

            // Calculate Top 5 Albums
            const albumMap = new Map();
            topTracks.items.forEach(t => {
              if (t.album?.id && t.album.name && t.artists?.[0]) {
                const id = t.album.id;
                if (!albumMap.has(id)) {
                  albumMap.set(id, {
                    name: t.album.name,
                    artist: t.artists[0].name,
                    image: t.album.images?.[0]?.url || '',
                    count: 0
                  });
                }
                albumMap.get(id).count++;
              }
            });
            const top5Albums = Array.from(albumMap.values())
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);

            // Calculate Top 5 Genres
            const genreCounts: Record<string, number> = {};
            topArtists.items.forEach(a => {
              if (a.genres) {
                a.genres.forEach(g => {
                  genreCounts[g] = (genreCounts[g] || 0) + 1;
                });
              }
            });
            const top5Genres = Object.keys(genreCounts)
              .sort((a, b) => genreCounts[b] - genreCounts[a])
              .slice(0, 5);

            // Calculate unique artists
            const uniqueArtistsSet = new Set<string>();
            topTracks.items.forEach(t => {
              t.artists?.forEach(a => uniqueArtistsSet.add(a.id));
            });

            // Calculate Total Minutes
            const totalMs = topTracks.items.reduce((acc, t) => acc + (t.duration_ms || 0), 0);
            const estimatedMins = Math.floor(totalMs / 60000);

            // Calculate average track duration
            const avgMs = totalMs / topTracks.items.length;
            const avgDuration = Math.round(avgMs / 1000 / 60);

            // Find most popular track
            const mostPopular = topTracks.items.reduce((prev, current) => 
              (current.popularity || 0) > (prev.popularity || 0) ? current : prev
            );

            // Get top genre count
            const topGenreCount = genreCounts[top5Genres[0]] || 0;

            newData[period.key] = {
              tracks: topTracks.items.slice(0, 5),
              artists: topArtists.items.slice(0, 5),
              albums: top5Albums,
              genres: top5Genres,
              minutes: estimatedMins,
              mostPopularTrack: mostPopular,
              averageTrackDuration: avgDuration,
              uniqueArtists: uniqueArtistsSet.size,
              topGenreCount
            };
          } catch (err) {
            console.error(`Error fetching ${period.label}:`, err);
            newData[period.key] = null;
          }
        });

        await Promise.all(fetchPromises);
        setData(newData);

        const hasData = Object.values(newData).some(d => d !== null);
        if (!hasData) {
          throw new Error("Failed to fetch data for any time period");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("❌ Data Fetch Error:", err);
        console.error("Error details:", { message: errorMessage, stack: err instanceof Error ? err.stack : 'N/A' });
        setError(`Failed to load your wrap: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    const runInitSequence = async () => {
      await initAuth();
      await getStats();
    };

    runInitSequence();
  }, []);

  const exportImage = async () => {
    if (!slideRef.current) return;

    setExportLoading(true);
    try {
      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: '#050505',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true
      });
      const link = document.createElement('a');
      link.download = `spotify-wrapped-last-60-days.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export image";
      console.error("Export Error:", err);
      alert(`Error exporting image: ${errorMessage}`);
    } finally {
      setExportLoading(false);
    }
  };

  const currentData = data['short_term'];

  if (error) {
    return (
      <div className="app-viewport">
        <div className="login-screen">
          <h1 className="big-text">SPOTIFY WRAPPED</h1>
          <p style={{ color: '#ff6b6b', marginBottom: '20px' }}>{error}</p>
          <button
            className="share-btn"
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                await sdk.authenticate();
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Authentication failed";
                setError(msg);
                console.error("Auth failed:", err);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Authenticating..." : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  if (!user || !currentData) {
    return (
      <div className="app-viewport">
        <div className="login-screen">
          <h1 className="big-text">SPOTIFY WRAPPED</h1>
          <p style={{ color: '#b3b3b3', marginBottom: '20px' }}>
            {loading ? "Loading your stats..." : "Connect your Spotify to see your wrap"}
          </p>
          <button
            className="share-btn"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await sdk.authenticate();
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Authentication failed";
                setError(msg);
                console.error("Auth failed:", err);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Authenticating..." : "Unlock Your Wrap"}
          </button>
        </div>
      </div>
    );
  }

  const slides = [
    {
      title: "Your 2024 Wrapped",
      content: (
        <div className="title-slide">
          <div className="welcome-text">
            Hey <span className="username">{user.display_name || 'there'}</span>,
          </div>
          <div className="subtitle">Here's what you've been vibing to</div>
        </div>
      )
    },
    {
      title: "The Vibe",
      content: <div className="big-text genre-spotlight">{currentData.genres[0] || "Music"}</div>,
      subtitle: `You listened to ${currentData.topGenreCount} different ${currentData.genres[0]} tracks`
    },
    {
      title: "Top Artists",
      list: currentData.artists.map(a => a.name)
    },
    {
      title: "Most Streamed Songs",
      list: currentData.tracks.map(t => t.name)
    },
    {
      title: "Top Albums",
      list: currentData.albums.map(al => `${al.name} by ${al.artist}`)
    },
    {
      title: "Top Genres",
      list: currentData.genres
    },
    {
      title: "Your Stats",
      content: (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{currentData.uniqueArtists}</div>
            <div className="stat-label">Unique Artists</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{currentData.averageTrackDuration}m</div>
            <div className="stat-label">Avg Track Length</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{currentData.mostPopularTrack?.popularity || 0}</div>
            <div className="stat-label">Top Track Popularity</div>
          </div>
        </div>
      )
    },
    {
      title: "The Damage",
      content: (
        <div className="share-slide">
          <div className="big-mins">{currentData.minutes.toLocaleString()} <br /><span>minutes played</span></div>
          <div className="time-context">
            That's {Math.round(currentData.minutes / 1440)} days of non-stop music
          </div>
          <button 
            className="share-btn" 
            disabled={exportLoading}
            onClick={(e) => { e.stopPropagation(); exportImage(); }}
          >
            {exportLoading ? "Exporting..." : "Download & Share"}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="app-viewport" onClick={() => setCurrentSlide((s) => (s + 1) % slides.length)}>
      {/* Header with User */}
      <div className="slide-header">
        <div className="slide-count">{currentSlide + 1} / {slides.length}</div>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        {slides.map((_, i) => (
          <div 
            key={i} 
            className={`bar ${i <= currentSlide ? 'fill' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentSlide(i);
            }}
          />
        ))}
      </div>

      {/* Slide Content */}
      <div className={`slide-content slide-${currentSlide}`} ref={slideRef}>
        <h3>{slides[currentSlide].title}</h3>
        {slides[currentSlide].subtitle && (
          <p className="slide-subtitle">{slides[currentSlide].subtitle}</p>
        )}
        {slides[currentSlide].list ? (
          <ul className="stats-list">
            {slides[currentSlide].list.map((item, idx) => (
              <li key={idx}><span className="rank">{idx + 1}</span> {item}</li>
            ))}
          </ul>
        ) : slides[currentSlide].content}
      </div>

      {/* Navigation hint */}
      <div className="nav-hint">
        {currentSlide < slides.length - 1 ? "Click or press → to continue" : "You've reached the end"}
      </div>
    </div>
  );
}

export default App;
