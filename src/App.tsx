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

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [data, setData] = useState<WrappedData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch stats function
  const getStats = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      console.log("🔵 Fetching user profile...");
      const profile = await sdk.currentUser.profile();
      console.log("✅ Profile fetched:", profile);
      setUser(profile);

      try {
        console.log("🔵 Fetching top tracks (last 60 days)...");
        const topTracks = await sdk.currentUser.topItems("tracks", "short_term", 50);
        
        if (!topTracks?.items || topTracks.items.length === 0) {
          throw new Error("No tracks found in last 60 days");
        }

        console.log("✅ Top tracks:", topTracks.items.length);

        console.log("🔵 Fetching top artists...");
        const topArtists = await sdk.currentUser.topItems("artists", "short_term", 50);
        
        if (!topArtists?.items || topArtists.items.length === 0) {
          throw new Error("No artists found in last 60 days");
        }

        console.log("✅ Top artists:", topArtists.items.length);

        // Calculate Top Albums
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
        const topAlbums = Array.from(albumMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Calculate Genres
        const genreCounts: Record<string, number> = {};
        topArtists.items.forEach(a => {
          if (a.genres && a.genres.length > 0) {
            a.genres.forEach(g => {
              genreCounts[g] = (genreCounts[g] || 0) + 1;
            });
          }
        });
        const topGenres = Object.keys(genreCounts)
          .sort((a, b) => genreCounts[b] - genreCounts[a])
          .slice(0, 5);

        // Calculate unique artists
        const uniqueArtistsSet = new Set<string>();
        topTracks.items.forEach(t => {
          t.artists?.forEach(a => uniqueArtistsSet.add(a.id));
        });

        // Calculate total minutes
        const totalMs = topTracks.items.reduce((acc, t) => acc + (t.duration_ms || 0), 0);
        const totalMinutes = Math.floor(totalMs / 60000);

        // Calculate average duration
        const avgMs = totalMs / topTracks.items.length;
        const avgDuration = Math.round(avgMs / 1000 / 60);

        // Find most popular track
        const mostPopular = topTracks.items.reduce((prev, current) => 
          (current.popularity || 0) > (prev.popularity || 0) ? current : prev
        );

        // Get top genre count
        const topGenreCount = genreCounts[topGenres[0]] || 0;

        const newData: WrappedData = {
          tracks: topTracks.items.slice(0, 5),
          artists: topArtists.items.slice(0, 5),
          albums: topAlbums,
          genres: topGenres,
          minutes: totalMinutes,
          mostPopularTrack: mostPopular,
          averageTrackDuration: avgDuration,
          uniqueArtists: uniqueArtistsSet.size,
          topGenreCount
        };

        setData(newData);
        setLastUpdate(new Date());
        console.log("✅ Data updated successfully");
      } catch (err) {
        console.error("Error fetching stats:", err);
        throw err;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("❌ Data Fetch Error:", err);
      setError(`Failed to load your wrap: ${errorMessage}`);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial auth and data fetch
  useEffect(() => {
    const initApp = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const authError = params.get('error');
        
        if (authError) {
          console.error("❌ Spotify rejected auth:", authError);
          setError(`Spotify auth error: ${authError}`);
          return;
        }
        
        if (code) {
          console.log("🔵 OAuth redirect detected, exchanging code...");
          try {
            await sdk.authenticate();
            console.log("✅ Authentication complete");
            setAuthenticated(true);
            window.history.replaceState({}, document.title, window.location.pathname);
            // Fetch data after auth succeeds
            await getStats();
          } catch (authErr) {
            console.error("❌ SDK authenticate failed:", authErr);
            setError(`Auth failed: ${authErr instanceof Error ? authErr.message : String(authErr)}`);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      }
    };

    initApp();
  }, []);

  // Auto-refresh every 20 seconds when authenticated
  useEffect(() => {
    if (authenticated && user && data) {
      console.log("⏰ Starting auto-refresh interval (20 seconds)");
      
      // Refresh immediately, then every 20 seconds
      refreshIntervalRef.current = setInterval(() => {
        console.log("🔄 Auto-refreshing data...");
        getStats(false); // Don't show loading indicator on auto-refresh
      }, 20000); // 20 seconds

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          console.log("⏹️ Stopped auto-refresh interval");
        }
      };
    }
  }, [authenticated, user, data]);

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
      link.download = `spotify-wrapped-${new Date().toISOString().slice(0, 10)}.png`;
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

  // Force login screen if not authenticated
  if (!authenticated) {
    return (
      <div className="app-viewport">
        <div className="login-screen">
          <h1 className="big-text">SPOTIFY WRAPPED</h1>
          <p style={{ color: '#b3b3b3', marginBottom: '20px' }}>
            Connect your Spotify account to see your wrap
          </p>
          <button
            className="share-btn"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                console.log("🔵 Starting Spotify authentication...");
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
            {loading ? "Connecting to Spotify..." : "Login with Spotify"}
          </button>
          {error && <p style={{ color: '#ff6b6b', marginTop: '20px', fontSize: '12px' }}>{error}</p>}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="app-viewport">
        <div className="login-screen">
          <h1 className="big-text">SPOTIFY WRAPPED</h1>
          <p style={{ color: '#ff6b6b', marginBottom: '20px' }}>{error}</p>
          <button
            className="share-btn"
            onClick={async () => {
              setError(null);
              await getStats();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user || !data) {
    return (
      <div className="app-viewport">
        <div className="login-screen">
          <h1 className="big-text">SPOTIFY WRAPPED</h1>
          <p style={{ color: '#b3b3b3', marginBottom: '20px' }}>
            Loading your 60-day wrap...
          </p>
          <div style={{ color: '#1db954', marginTop: '20px' }}>⏳</div>
        </div>
      </div>
    );
  }

  const slides = [
    {
      title: "Your Last 60 Days",
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
      content: <div className="big-text genre-spotlight">{data.genres[0] || "Music"}</div>,
      subtitle: `You listened to ${data.topGenreCount} different ${data.genres[0]} tracks`
    },
    {
      title: "Top 5 Artists",
      list: data.artists.map(a => a.name)
    },
    {
      title: "Most Streamed Songs",
      list: data.tracks.map(t => t.name)
    },
    {
      title: "Top Albums",
      list: data.albums.map(al => `${al.name} by ${al.artist}`)
    },
    {
      title: "Top Genres",
      list: data.genres
    },
    {
      title: "Your Stats",
      content: (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{data.uniqueArtists}</div>
            <div className="stat-label">Unique Artists</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data.averageTrackDuration}m</div>
            <div className="stat-label">Avg Track Length</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data.mostPopularTrack?.popularity || 0}</div>
            <div className="stat-label">Top Track Popularity</div>
          </div>
        </div>
      )
    },
    {
      title: "The Damage",
      content: (
        <div className="share-slide">
          <div className="big-mins">{data.minutes.toLocaleString()} <br /><span>minutes played</span></div>
          <div className="time-context">
            That's {Math.round(data.minutes / 1440)} days of non-stop music
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
      <div className="slide-header">
        <div className="slide-count">{currentSlide + 1} / {slides.length}</div>
        {lastUpdate && (
          <div className="last-update">
            Updated {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

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

      <div className="nav-hint">
        {currentSlide < slides.length - 1 ? "Click or press → to continue" : "You've reached the end"}
      </div>
    </div>
  );
}

export default App;
