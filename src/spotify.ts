import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const CLIENT_ID = "1fa712c9c91b4850b6557d382076827d";

// Determine redirect URI based on environment
const getRedirectUri = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000'; // Fallback during SSR
  }
  
  const origin = window.location.origin;
  // Ensure no trailing slash for consistency
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

const REDIRECT_URI = getRedirectUri();

const SCOPES = ["user-top-read", "user-read-private", "user-read-email"];

export const sdk = SpotifyApi.withUserAuthorization(
  CLIENT_ID,
  REDIRECT_URI,
  SCOPES
);

console.log("Spotify SDK initialized with redirect URI:", REDIRECT_URI);