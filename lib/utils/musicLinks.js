// lib/utils/musicLinks.js
// Mirror of the web util — shared bits for "open in your streaming service".

export const MUSIC_SERVICES = [
  {
    id: "spotify",
    name: "Spotify",
    description: "Direct links to songs and albums",
  },
  {
    id: "apple_music",
    name: "Apple Music",
    description: "Direct links when we can match the song",
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    description: "Opens a ready-made search in SoundCloud",
  },
  {
    id: "bandcamp",
    name: "Bandcamp",
    description: "Opens a ready-made search on Bandcamp",
  },
];

export const DEFAULT_MUSIC_SERVICE = "spotify";

export function musicServiceName(service) {
  return MUSIC_SERVICES.find((s) => s.id === service)?.name || "Spotify";
}

// Spotify/Apple Music usually land directly on the song, SoundCloud/
// Bandcamp land on a search — the verb sets expectations.
export function listenLabel(service) {
  const name = musicServiceName(service);
  return service === "soundcloud" || service === "bandcamp"
    ? `Find on ${name}`
    : `Listen on ${name}`;
}

// Build the query params for /api/music-link from a post object.
// New posts carry external_id/external_type; old posts fall back to
// title + artist parsed from the "Album • Artist" subtitle.
export function buildMusicLinkParams(post, service) {
  const params = new URLSearchParams({ service });

  if (post?.external_id) params.set("spotify_id", post.external_id);
  if (post?.external_type) params.set("spotify_type", post.external_type);

  const title = post?.title || "";
  if (title) params.set("title", title);

  const parts = (post?.subtitle || "")
    .split("•")
    .map((p) => p.trim())
    .filter(Boolean);
  // Subtitle is "Album • Artist" for tracks, or just the artist/publisher —
  // the last segment is the artist either way.
  const artist = parts.length ? parts[parts.length - 1] : "";
  if (artist) params.set("artist", artist);

  return params;
}
