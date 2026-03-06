import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const CLIENT_ID = "1fa712c9c91b4850b6557d382076827d";

const getRedirectUri = () => {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:5173/';return 'http://127.0.0.1:5173/';
  }

  const origin = window.location.origin;
  return origin.endsWith('/') ? origin : origin + '/';
};

const REDIRECT_URI = getRedirectUri();

const SCOPES = ["user-top-read", "user-read-private", "user-read-email"];

// Create SDK with explicit configuration
export const sdk = SpotifyApi.withUserAuthorization(
  CLIENT_ID,
  REDIRECT_URI,
  SCOPES
);

// Clear any stale auth data on init to prevent PKCE mismatches
if (typeof window !== 'undefined') {
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.includes('spotify') || key.includes('pkce')) {
      sessionStorage.removeItem(key);
    }
  });
}

console.log("Spotify SDK initialized with redirect URI:", REDIRECT_URI);
