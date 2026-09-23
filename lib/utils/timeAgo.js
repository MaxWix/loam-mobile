export function timeAgo(timestamp) {
  if (!timestamp) return "";
  let iso = timestamp;
  if (
    !timestamp.endsWith("Z") &&
    !timestamp.includes("+") &&
    !timestamp.includes("-", 10)
  ) {
    iso = timestamp.replace(" ", "T") + "Z";
  }
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min";
  if (mins < 60) return `${mins} min`;
  if (hours === 1) return "1h";
  if (hours < 24) return `${hours}h`;
  if (hours < 48) return "1 day";
  return "2 days";
}
