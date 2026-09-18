export function getImage(item, category) {
  if (category === "reading") {
    return item.cover_i
      ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
      : null;
  }
  if (category === "watching") {
    return item.poster_path
      ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
      : null;
  }
  if (category === "listening") {
    const images = item.type === "track" ? item.album?.images : item.images;
    return images?.[0]?.url || null;
  }
  return null;
}

export function getSubtitle(item, category) {
  if (category === "reading") {
    return item.author_name
      ? item.author_name.slice(0, 2).join(", ")
      : "Unknown Author";
  }
  if (category === "watching") {
    if (item.media_type === "movie" || item.release_date) {
      const year = item.release_date?.slice(0, 4);
      return `Movie${year ? ` • ${year}` : ""}`;
    }
    const year = item.first_air_date?.slice(0, 4);
    return `TV${year ? ` • ${year}` : ""}`;
  }
  if (category === "listening") {
    if (item.type === "show") return `Podcast • ${item.publisher}`;
    const type = item.type === "album" ? "Album" : "Song";
    const artist = item.artists?.map((a) => a.name).join(", ");
    return `${type} • ${artist}`;
  }
  return "";
}

export function getTitle(item) {
  return item.title || item.name || "";
}

export function smartMerge(listA, listB, searchQuery) {
  const combined = [...listA, ...listB];
  const cleanQuery = searchQuery.toLowerCase().trim();
  const getScore = (item) =>
    item.popularity !== undefined
      ? item.popularity
      : item.type === "show"
        ? 60
        : 0;
  combined.sort((a, b) => {
    const nameA = (a.title || a.name || "").toLowerCase();
    const nameB = (b.title || b.name || "").toLowerCase();
    const includesA = nameA.includes(cleanQuery) ? 0 : 1;
    const includesB = nameB.includes(cleanQuery) ? 0 : 1;
    if (includesA !== includesB) return includesA - includesB;
    return getScore(b) - getScore(a);
  });
  return combined;
}
