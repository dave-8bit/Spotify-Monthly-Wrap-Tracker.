import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const CLIENT_ID = "1fa712c9c91b4850b6557d382076827d";

const getRedirectUri = () => {
  if (typeof window === 'undefined') return 'http://127.0.0.1/:5173/';

  const origin = window.location.origin;
  
  // If we are on Vercel, force the trailing slash to match the "fixed" Spotify Dashboard setting
  if (origin.includes('vercel.app')) {
    return origin.endsWith('/') ? origin : `${origin}/`;
  }

  // For localhost, also ensure it matches what you have in the dashboard
  return origin.endsWith('/') ? origin : `${origin}/`;
};

const REDIRECT_URI = getRedirectUri();

const SCOPES = ["user-top-read", "user-read-private", "user-read-email"];

export const sdk = SpotifyApi.withUserAuthorization(
  CLIENT_ID,
  REDIRECT_URI,
  SCOPES
);

console.log("Matching Dashboard URI:", REDIRECT_URI);