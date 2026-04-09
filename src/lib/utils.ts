export function formatRelativeTimestamp(value: string | null) {
  if (!value) {
    return "Now";
  }

  const date = new Date(value);
  const differenceInMinutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (differenceInMinutes < 1) {
    return "Now";
  }

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes}m`;
  }

  const differenceInHours = Math.round(differenceInMinutes / 60);

  if (differenceInHours < 24) {
    return `${differenceInHours}h`;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatMessageTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCompactNumber(value: number | null) {
  if (value === null) {
    return "Unknown";
  }

  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function getInitials(name: string | null, username: string | null) {
  const base = name ?? username ?? "IG";

  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "IG";
}

export function truncateText(value: string | null, maxLength = 60) {
  if (!value) {
    return "No messages yet";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

