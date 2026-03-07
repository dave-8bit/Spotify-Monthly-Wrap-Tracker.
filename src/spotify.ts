import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const CLIENT_ID = "1fa712c9c91b4850b6557d382076827d";

const getRedirectUri = () => {
  // If we're not in a browser, default to localhost
  if (typeof window === 'undefined') return 'http://127.0.0.1:5173/';

  const origin = window.location.origin;
  
  // This ensures that whether you are on localhost or Vercel, 
  // the URI always ends with a '/' to match your "fixed" Spotify Dashboard setting.
  return origin.endsWith('/') ? origin : `${origin}/`;
};

const REDIRECT_URI = getRedirectUri();

const SCOPES = ["user-top-read", "user-read-private", "user-read-email"];

export const sdk = SpotifyApi.withUserAuthorization(
  CLIENT_ID,
  REDIRECT_URI,
  SCOPES
);

console.log("SDK initialized with URI:", REDIRECT_URI);

//When it says login with spotifyi need the standard spotify login page to show up and also i need it to update every 20 seconds cause i dont need the data hardcoded, i need to see displacfement at all times. Every data should be perfect, genres,songs,artist and other standard spotify wrap. I need it perfect and sleeky. Track data within seconds,once i refresh the page refresh the data. I need it to start from the past 60 days to whatever. The starting point should be 60 days ago till date.