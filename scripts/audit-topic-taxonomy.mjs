import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const root = process.cwd();
const vaultRoot = process.env.VAULT_ROOT ? path.resolve(process.env.VAULT_ROOT) : path.join(root, "vault");
const sessionRoot = path.join(vaultRoot, "sessions");
const topicsRoot = path.join(vaultRoot, "topics");
const DEFAULT_LIMIT = 10;

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

const limit = Number(argValue("--limit")) || DEFAULT_LIMIT;
const sessionFilter = argValue("--session");
const asJson = process.argv.includes("--json");

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function relativeToRoot(filePath) {
  return toPosix(path.relative(root, filePath));
}

function walkSessionSourceFiles() {
  if (!fs.existsSync(sessionRoot)) return [];
  const files = [];
  for (const year of fs.readdirSync(sessionRoot).sort()) {
    if (!/^\d{4}$/.test(year)) continue;
    const yearDir = path.join(sessionRoot, year);
    for (const month of fs.readdirSync(yearDir).sort()) {
      if (!/^\d{2}$/.test(month)) continue;
      const monthDir = path.join(yearDir, month);
      for (const sessionId of fs.readdirSync(monthDir).sort()) {
        const sourcePath = path.join(monthDir, sessionId, "source.yaml");
        if (fs.existsSync(sourcePath)) files.push(sourcePath);
      }
    }
  }
  return files;
}

function markdownSection(markdown, heading) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";
  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line.trim()));
  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n").trim();
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts, ([value, count]) => ({ value, count }))
    .filter((item) => item.count > 1)
    .sort((left, right) => left.value.localeCompare(right.value));
}

function loadSessions() {
  return walkSessionSourceFiles().map((sourcePath) => {
    const source = yaml.load(fs.readFileSync(sourcePath, "utf8")) || {};
    const sessionDir = path.dirname(sourcePath);
    return {
      id: source.id || path.basename(sessionDir),
      title: source.title_zh || source.title || source.id || path.basename(sessionDir),
      path: relativeToRoot(sessionDir),
      sourcePath: relativeToRoot(sourcePath),
      topics: Array.isArray(source?.topics?.approved) ? source.topics.approved : [],
    };
  });
}

function loadTopicDuplicateRefs(topicId) {
  const indexPath = path.join(topicsRoot, topicId, "index.md");
  if (!fs.existsSync(indexPath)) return [];
  const markdown = fs.readFileSync(indexPath, "utf8");
  const refs =
    markdownSection(markdown, "关联 sessions")
      .match(/vault\/sessions\/\d{4}\/\d{2}\/[A-Za-z0-9._-]+\/?/g)
      ?.map((ref) => ref.replace(/\/$/, "")) || [];
  return duplicateValues(refs).map(({ value, count }) => ({ path: value, count }));
}

function audit() {
  const sessions = loadSessions();
  const topicSessions = new Map();
  for (const session of sessions) {
    for (const topicId of session.topics) {
      if (!topicSessions.has(topicId)) topicSessions.set(topicId, []);
      topicSessions.get(topicId).push(session);
    }
  }

  const overLimit = [];
  const duplicateRefs = [];
  for (const [topicId, relatedSessions] of topicSessions.entries()) {
    if (relatedSessions.length > limit) {
      const coTopics = new Map();
      for (const session of relatedSessions) {
        for (const relatedTopicId of session.topics) {
          if (relatedTopicId === topicId) continue;
          coTopics.set(relatedTopicId, (coTopics.get(relatedTopicId) ?? 0) + 1);
        }
      }
      overLimit.push({
        topicId,
        count: relatedSessions.length,
        limit,
        overBy: relatedSessions.length - limit,
        coTopics: Array.from(coTopics, ([id, count]) => ({ id, count }))
          .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id))
          .slice(0, 12),
        sessions: relatedSessions.map(({ id, title, path, topics }) => ({ id, title, path, topics })),
      });
    }

    const duplicates = loadTopicDuplicateRefs(topicId);
    if (duplicates.length) duplicateRefs.push({ topicId, duplicates });
  }

  const focusedSession = sessionFilter
    ? sessions.find((session) => session.path === sessionFilter.replace(/\/$/, "") || session.sourcePath === sessionFilter)
    : null;
  const focusedTopics = focusedSession
    ? overLimit.filter((topic) => focusedSession.topics.includes(topic.topicId))
    : [];

  return {
    generatedAt: new Date().toISOString(),
    limit,
    sessions: sessions.length,
    topics: topicSessions.size,
    overLimit,
    duplicateRefs,
    focusedSession,
    focusedTopics,
  };
}

function printText(report) {
  console.log(`topic taxonomy audit: ${report.sessions} sessions / ${report.topics} topics / limit ${report.limit}`);
  if (report.focusedSession) {
    console.log(`focused session: ${report.focusedSession.id}`);
    console.log(`approved topics: ${report.focusedSession.topics.join(", ") || "none"}`);
  }
  if (!report.overLimit.length) {
    console.log("over-limit topics: none");
  } else {
    console.log("over-limit topics:");
    for (const topic of report.overLimit) {
      console.log(`- ${topic.topicId}: ${topic.count} sessions (+${topic.overBy})`);
      if (topic.coTopics.length) {
        console.log(`  co-topics: ${topic.coTopics.map((item) => `${item.id}:${item.count}`).join(", ")}`);
      }
    }
  }
  if (report.duplicateRefs.length) {
    console.log("duplicate refs in ## 关联 sessions:");
    for (const topic of report.duplicateRefs) {
      console.log(`- ${topic.topicId}: ${topic.duplicates.map((item) => `${item.path} x${item.count}`).join("; ")}`);
    }
  }
  if (report.focusedSession && report.focusedTopics.length) {
    console.log("focused session touches over-limit topics:");
    for (const topic of report.focusedTopics) console.log(`- ${topic.topicId}: ${topic.count} sessions`);
  }
}

const report = audit();
if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printText(report);
}
