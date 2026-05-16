import type { Route } from "./types";

export function parseRoute(hash: string): Route {
  const normalized = hash.replace(/^#/, "") || "/";
  const parts = normalized.split("/").filter(Boolean).map(decodeURIComponent);

  if (parts.length === 0) return { name: "overview" };
  if (parts[0] === "sessions" && parts.length === 1) return { name: "sessions" };
  if (parts[0] === "sessions" && parts[1]) return { name: "session", id: parts[1] };
  if (parts[0] === "topics" && parts.length === 1) return { name: "topics" };
  if (parts[0] === "topics" && parts[1]) return { name: "topic", id: parts[1] };
  if (parts[0] === "health") return { name: "health" };

  return { name: "notFound", path: normalized };
}

export function href(path: string) {
  return `#${path}`;
}
