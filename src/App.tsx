import { useEffect, useState } from 'react';
import { sdk } from './spotify';
// Add the 'type' keyword here:
import type { UserProfile, Artist, Track } from '@spotify/web-api-ts-sdk'; 
import './App.css';

// Define the shape of our Wrap data to fix 'Unexpected any'
interface WrapStats {
  tracks: Track[];
  artists: Artist[];
  genre: string;
  estimatedMinutes: number;
}

function App() {
  // All Hooks must be INSIDE this function
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<WrapStats | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profile = await sdk.currentUser.profile();
        setUser(profile);

        const topTracks = await sdk.currentUser.topItems("tracks", "long_term", 5);
        const topArtists = await sdk.currentUser.topItems("artists", "long_term", 5);

        // Logic to find favorite genre
        const allGenres = topArtists.items.flatMap(a => a.genres);
        const favoriteGenre = allGenres.sort((a, b) =>
          allGenres.filter(v => v === a).length - allGenres.filter(v => v === b).length
        ).pop() || "Music";

        // Estimate Minutes
        const totalMs = topTracks.items.reduce((acc, track) => acc + track.duration_ms, 0);
        const estimatedMinutes = Math.floor((totalMs * 15) / 60000);

        setStats({
          tracks: topTracks.items,
          artists: topArtists.items,
          genre: favoriteGenre,
          estimatedMinutes
        });
      } catch (e) {
        console.error("Auth error:", e);
      }
    };

    fetchData();
  }, []);

  // Show login button if not authenticated
  if (!user) {
    return (
      <div className="login-screen">
        <h1>Monthly Wrap</h1>
        <button onClick={() => sdk.authenticate()}>Login with Spotify</button>
      </div>
    );
  }

  return (
    <div className="wrap-container">
      <h1>{user.display_name}'s Top 5</h1>
      
      {stats && (
        <div className="stats-display">
          <h2>Favorite Genre: {stats.genre}</h2>
          <p>Estimated Yearly Listening: {stats.estimatedMinutes} mins</p>
          
          <div className="top-list">
            <h3>Top Songs</h3>
            {stats.tracks.map(track => <p key={track.id}>{track.name}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;