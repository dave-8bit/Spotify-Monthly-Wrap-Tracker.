import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const CLIENT_ID = "1fa712c9c91b4850b6557d382076827d";

// Makes it work on laptop and on Vercel
const REDIRECT_URI = window.location.origin; 

const SCOPES = ["user-top-read", "user-read-private", "user-read-email"];

export const sdk = SpotifyApi.withUserAuthorization(
  CLIENT_ID,
  REDIRECT_URI,
  SCOPES
);