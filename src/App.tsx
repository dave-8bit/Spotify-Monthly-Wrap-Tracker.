import { useEffect, useState } from 'react';
import { sdk } from './spotify';
import type { UserProfile, Artist, Track } from '@spotify/web-api-ts-sdk';
import './App.css';

interface WrappedData {
  tracks: Track[];
  artists: Artist[];
  albums: { name: string; artist: string; image: string }[];
  genres: string[];
  minutes: number;
}

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [data, setData] = useState<WrappedData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const getStats = async () => {
      try {
        const profile = await sdk.currentUser.profile();
        setUser(profile);

        // Fetching 'medium_term' (approx. 6 months/60+ days)
        const topTracks = await sdk.currentUser.topItems("tracks", "medium_term", 20);
        const topArtists = await sdk.currentUser.topItems("artists", "medium_term", 5);

        // 1. Calculate Top 5 Albums (Extracted from top tracks)
        const albumMap = new Map();
        topTracks.items.forEach(t => {
          const id = t.album.id;
          if (!albumMap.has(id)) {
            albumMap.set(id, { name: t.album.name, artist: t.artists[0].name, image: t.album.images[0].url, count: 0 });
          }
          albumMap.get(id).count++;
        });
        const top5Albums = Array.from(albumMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);

        // 2. Calculate Top 5 Genres
        const genreCounts: Record<string, number> = {};
        topArtists.items.forEach(a => a.genres.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
        const top5Genres = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]).slice(0, 5);

        // 3. Estimate Minutes (Top tracks * repeat estimate)
        const totalMs = topTracks.items.slice(0, 5).reduce((acc, t) => acc + t.duration_ms, 0);
        const estimatedMins = Math.floor((totalMs * 12) / 60000); 

        setData({
          tracks: topTracks.items.slice(0, 5),
          artists: topArtists.items,
          albums: top5Albums,
          genres: top5Genres,
          minutes: estimatedMins
        });
      } catch (err) { console.error(err); }
    };
    getStats();
  }, []);

  if (!user || !data) return <div className="loading"><button onClick={() => sdk.authenticate()}>Unlock My Wrap</button></div>;

  const slides = [
    { title: "Your Vibe", content: <div className="big-text">{data.genres[0]}</div> },
    { title: "Top Artists", list: data.artists.map(a => a.name) },
    { title: "Top Songs", list: data.tracks.map(t => t.name) },
    { title: "Top Albums", list: data.albums.map(al => al.name) },
    { title: "The Damage", content: <div className="big-mins">{data.minutes.toLocaleString()} <br/><span>minutes played</span></div> }
  ];

  return (
    <div className="app-viewport" onClick={() => setCurrentSlide((s) => (s + 1) % slides.length)}>
      <div className="progress-container">
        {slides.map((_, i) => <div key={i} className={`bar ${i <= currentSlide ? 'fill' : ''}`} />)}
      </div>
      
      <div className="slide-content">
        <h3>{slides[currentSlide].title}</h3>
        {slides[currentSlide].list ? (
          <ul className="stats-list">
            {slides[currentSlide].list.map((item, idx) => (
              <li key={idx}><span className="rank">{idx + 1}</span> {item}</li>
            ))}
          </ul>
        ) : slides[currentSlide].content}
      </div>
    </div>
  );
}

export default App;