import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const CLIENT_ID = "1fa712c9c91b4850b6557d382076827d";

// Determine redirect URI based on environment
const getRedirectUri = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000'; 
  }
  
  const origin = window.location.origin;
  // Add trailing slash to match Spotify's normalization
  return origin.endsWith('/') ? origin : origin + '/';
};

const REDIRECT_URI = getRedirectUri();

const SCOPES = ["user-top-read", "user-read-private", "user-read-email"];

export const sdk = SpotifyApi.withUserAuthorization(
  CLIENT_ID,
  REDIRECT_URI,
  SCOPES
);

console.log("Spotify SDK initialized with redirect URI:", REDIRECT_URI);