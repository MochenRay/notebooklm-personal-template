import sessionsJson from "../.viewer-data/sessions.json";
import topicsJson from "../.viewer-data/topics.json";
import healthJson from "../.viewer-data/health.json";
import type { HealthData, SessionsData, TopicsData } from "./types";

export const sessionsData = sessionsJson as SessionsData;
export const topicsData = topicsJson as TopicsData;
export const healthData = healthJson as HealthData;

export const sessions = sessionsData.sessions;
export const topics = topicsData.topics;
export const snapshot = sessionsData.snapshot;

export const sessionById = new Map(sessions.map((session) => [session.id, session]));
export const topicById = new Map(topics.map((topic) => [topic.id, topic]));

export const allTopicIds = topics
  .map((topic) => topic.id)
  .sort((left, right) => left.localeCompare(right));

export const latestMonth = snapshot.monthRange[snapshot.monthRange.length - 1] ?? "";
