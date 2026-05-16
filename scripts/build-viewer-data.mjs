import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

const root = process.cwd();
const vaultRoot = process.env.VAULT_ROOT ? path.resolve(process.env.VAULT_ROOT) : path.join(root, "vault");
const outputRoot = process.env.VIEWER_DATA_DIR
  ? path.resolve(process.env.VIEWER_DATA_DIR)
  : path.join(root, ".viewer-data");
const sessionRoot = path.join(vaultRoot, "sessions");
const topicsRoot = path.join(vaultRoot, "topics");
const notebooksPath = path.join(vaultRoot, "notebooklm", "notebooks.yaml");

const now = new Date().toISOString();
const requiredSessionFiles = [
  "synthesis.md",
  "notebooklm/report.md",
  "notebooklm/topology.md",
  "notes/questions.md",
  "notes/my-notes.md",
  "notes/debate.md",
  "notes/process-log.md",
];

const artifactSchemas = {
  quiz: {
    path: "notebooklm/artifacts/quiz.json",
    validate: (value) =>
      isPlainObject(value) && typeof value.title === "string" && Array.isArray(value.questions),
    expected: "object with title and questions[]",
  },
  flashcards: {
    path: "notebooklm/artifacts/flashcards.json",
    validate: (value) =>
      isPlainObject(value) && typeof value.title === "string" && Array.isArray(value.cards),
    expected: "object with title and cards[]",
  },
  mindmap: {
    path: "notebooklm/artifacts/mindmap.json",
    validate: (value) =>
      isPlainObject(value) && typeof value.name === "string" && Array.isArray(value.children),
    expected: "object with name and children[]",
  },
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function relativeToRoot(filePath) {
  return toPosix(path.relative(root, filePath));
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function readYamlIfExists(filePath, findings, context) {
  if (!fs.existsSync(filePath)) {
    findings.push({
      severity: "error",
      type: "missing_source_yaml",
      path: relativeToRoot(filePath),
      message: "source.yaml is required for every learning session.",
      context,
    });
    return null;
  }

  try {
    return yaml.load(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    findings.push({
      severity: "error",
      type: "invalid_source_yaml",
      path: relativeToRoot(filePath),
      message: error.message,
      context,
    });
    return null;
  }
}

function readJsonIfExists(filePath, findings, type, context) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    findings.push({
      severity: "error",
      type: "invalid_json_artifact",
      artifactType: type,
      path: relativeToRoot(filePath),
      message: error.message,
      context,
    });
    return null;
  }
}

function stripFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) {
    return markdown.trim();
  }

  const end = markdown.indexOf("\n---", 4);
  if (end === -1) {
    return markdown.trim();
  }

  return markdown.slice(end + 4).trim();
}

function firstParagraph(markdown) {
  const body = stripFrontmatter(markdown)
    .split(/\n{2,}/)
    .map((block) => block.replace(/^#+\s+/gm, "").trim())
    .find((block) => block && !block.startsWith("- "));
  return body ? body.replace(/\s+/g, " ").slice(0, 220) : "";
}

function walkSessionDirs() {
  if (!fs.existsSync(sessionRoot)) {
    return [];
  }

  const dirs = [];
  for (const year of fs.readdirSync(sessionRoot).sort()) {
    if (!/^\d{4}$/.test(year)) continue;
    const yearDir = path.join(sessionRoot, year);
    for (const month of fs.readdirSync(yearDir).sort()) {
      if (!/^\d{2}$/.test(month)) continue;
      const monthDir = path.join(yearDir, month);
      for (const sessionId of fs.readdirSync(monthDir).sort()) {
        const fullPath = path.join(monthDir, sessionId);
        if (fs.statSync(fullPath).isDirectory()) {
          dirs.push(fullPath);
        }
      }
    }
  }
  return dirs;
}

function getMarkdownLinks(markdown) {
  const links = [];
  const regex = /\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const target = match[1].trim();
    if (!target || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(target)) {
      continue;
    }
    links.push(target);
  }
  return links;
}

function declaredArtifactPaths(source) {
  const artifacts = source?.notebooklm?.artifacts;
  const paths = [];
  if (!isPlainObject(artifacts)) {
    return paths;
  }

  for (const [artifactType, artifact] of Object.entries(artifacts)) {
    if (!isPlainObject(artifact)) continue;
    if (typeof artifact.path === "string") {
      paths.push({ artifactType, path: artifact.path, status: artifact.status ?? "" });
    }
    if (isPlainObject(artifact.paths)) {
      for (const [format, artifactPath] of Object.entries(artifact.paths)) {
        if (typeof artifactPath === "string") {
          paths.push({ artifactType, format, path: artifactPath, status: artifact.status ?? "" });
        }
      }
    }
  }
  return paths;
}

function artifactCoverage(sessionDir, source, findings, sessionId) {
  const declared = declaredArtifactPaths(source);
  const coverage = declared.map((item) => {
    const fullPath = path.join(sessionDir, item.path);
    const exists = fs.existsSync(fullPath);
    if (!exists) {
      findings.push({
        severity: "error",
        type: "artifact_missing_path",
        sessionId,
        artifactType: item.artifactType,
        path: relativeToRoot(fullPath),
        message: `Declared artifact path is missing: ${item.path}`,
      });
    }
    if (item.status && item.status !== "completed") {
      findings.push({
        severity: "warning",
        type: "artifact_status_warning",
        sessionId,
        artifactType: item.artifactType,
        path: relativeToRoot(path.join(sessionDir, "source.yaml")),
        message: `Artifact status is ${item.status}.`,
      });
    }
    return {
      ...item,
      exists,
      localPath: toPosix(item.path),
    };
  });

  const statusFile = path.join(sessionDir, "notebooklm/artifacts/artifact-status.json");
  const statusData = readJsonIfExists(statusFile, findings, "artifact-status", { sessionId });
  if (statusData && !Array.isArray(statusData) && !isPlainObject(statusData)) {
    findings.push({
      severity: "warning",
      type: "artifact_status_shape_warning",
      sessionId,
      path: relativeToRoot(statusFile),
      message: "artifact-status.json should be an object or array.",
    });
  }

  return {
    declaredCount: declared.length,
    presentCount: coverage.filter((item) => item.exists).length,
    complete: coverage.length > 0 && coverage.every((item) => item.exists),
    items: coverage,
    statusShape: Array.isArray(statusData) ? "array" : isPlainObject(statusData) ? "object" : "missing",
  };
}

function readPractice(sessionDir, findings, sessionId) {
  const practice = {};
  for (const [type, schema] of Object.entries(artifactSchemas)) {
    const fullPath = path.join(sessionDir, schema.path);
    const data = readJsonIfExists(fullPath, findings, type, { sessionId });
    if (!data) continue;
    if (!schema.validate(data)) {
      findings.push({
        severity: "warning",
        type: "artifact_schema_warning",
        sessionId,
        artifactType: type,
        path: relativeToRoot(fullPath),
        message: `Expected ${schema.expected}. Viewer will hide this artifact.`,
      });
      continue;
    }
    practice[type] = data;
  }
  return practice;
}

function sessionHealth(findings, sessionId) {
  const own = findings.filter((finding) => finding.sessionId === sessionId);
  const errors = own.filter((finding) => finding.severity === "error").length;
  const warnings = own.filter((finding) => finding.severity === "warning").length;
  return {
    status: errors > 0 ? "error" : warnings > 0 ? "warning" : "ok",
    errors,
    warnings,
  };
}

function buildSessions(findings) {
  const sessions = [];
  const approvedTopicMap = new Map();

  for (const sessionDir of walkSessionDirs()) {
    const sourcePath = path.join(sessionDir, "source.yaml");
    const source = readYamlIfExists(sourcePath, findings, { sessionPath: relativeToRoot(sessionDir) });
    const fallbackId = path.basename(sessionDir);
    const sessionId = source?.id ?? fallbackId;
    const relativePath = relativeToRoot(sessionDir);
    const capturedAt = String(source?.captured_at ?? "");
    const month = relativePath.split("/").slice(2, 4).join("/");
    const approvedTopics = Array.isArray(source?.topics?.approved) ? source.topics.approved : [];

    for (const required of requiredSessionFiles) {
      const fullPath = path.join(sessionDir, required);
      if (!fs.existsSync(fullPath)) {
        findings.push({
          severity: required === "synthesis.md" ? "error" : "warning",
          type: required === "synthesis.md" ? "missing_synthesis" : "missing_session_file",
          sessionId,
          path: relativeToRoot(fullPath),
          message: `${required} is missing.`,
        });
      }
    }

    const sourceIds = Array.isArray(source?.notebooklm?.source_ids) ? source.notebooklm.source_ids : [];
    let primarySourceId = source?.notebooklm?.primary_source_id ?? "";
    let primarySourceInferred = false;
    if (!primarySourceId && sourceIds.length === 1) {
      primarySourceId = sourceIds[0];
      primarySourceInferred = true;
      findings.push({
        severity: "info",
        type: "missing_primary_source_id_inferred",
        sessionId,
        path: relativeToRoot(sourcePath),
        message: "primary_source_id is absent but can be inferred because there is exactly one source_id.",
      });
    } else if (!primarySourceId && sourceIds.length > 1) {
      findings.push({
        severity: "warning",
        type: "missing_primary_source_id",
        sessionId,
        path: relativeToRoot(sourcePath),
        message: "Multiple source_ids exist but primary_source_id is absent.",
      });
    }

    if (sourceIds.length > 1) {
      findings.push({
        severity: "warning",
        type: "multiple_source_ids",
        sessionId,
        path: relativeToRoot(sourcePath),
        message: "This session has multiple NotebookLM source_ids; inspect cleanup notes before reuse.",
      });
    }

    for (const topicId of approvedTopics) {
      if (!approvedTopicMap.has(topicId)) approvedTopicMap.set(topicId, []);
      approvedTopicMap.get(topicId).push(sessionId);
    }

    const markdownFiles = {
      synthesis: readTextIfExists(path.join(sessionDir, "synthesis.md")),
      report: readTextIfExists(path.join(sessionDir, "notebooklm/report.md")),
      topology: readTextIfExists(path.join(sessionDir, "notebooklm/topology.md")),
      questions: readTextIfExists(path.join(sessionDir, "notes/questions.md")),
      myNotes: readTextIfExists(path.join(sessionDir, "notes/my-notes.md")),
      debate: readTextIfExists(path.join(sessionDir, "notes/debate.md")),
      processLog: readTextIfExists(path.join(sessionDir, "notes/process-log.md")),
    };

    const coverage = artifactCoverage(sessionDir, source, findings, sessionId);
    const practice = readPractice(sessionDir, findings, sessionId);

    sessions.push({
      id: sessionId,
      title: source?.title || sessionId,
      author: source?.author || "",
      authorUrl: source?.author_url || "",
      capturedAt,
      month,
      sourceType: source?.source_type || "",
      url: source?.url || "",
      whyItMatters: source?.why_it_matters || "",
      path: relativePath,
      sourceYamlPath: relativeToRoot(sourcePath),
      topics: {
        proposed: Array.isArray(source?.topics?.proposed) ? source.topics.proposed : [],
        approved: approvedTopics,
      },
      tags: Array.isArray(source?.tags) ? source.tags : [],
      status: {
        stage: source?.status?.stage || "",
        publishCandidate: Boolean(source?.status?.publish_candidate),
        publishReason: source?.status?.publish_reason || "",
        topicReview: source?.status?.topic_review || "",
      },
      notebooklm: {
        notebookId: source?.notebooklm?.notebook_id || "",
        notebookTitle: source?.notebooklm?.notebook_title || "",
        sourceIds,
        primarySourceId,
        primarySourceInferred,
        sourceNote: source?.notebooklm?.source_note || "",
        profile: source?.notebooklm?.profile || "",
        conversationId: source?.notebooklm?.conversation_id || "",
        artifactCoverage: coverage,
      },
      content: {
        synthesis: stripFrontmatter(markdownFiles.synthesis),
        report: stripFrontmatter(markdownFiles.report),
        topology: stripFrontmatter(markdownFiles.topology),
        questions: stripFrontmatter(markdownFiles.questions),
        myNotes: stripFrontmatter(markdownFiles.myNotes),
        debate: stripFrontmatter(markdownFiles.debate),
        processLog: stripFrontmatter(markdownFiles.processLog),
        summary: firstParagraph(markdownFiles.synthesis),
      },
      practice,
      rereadScore:
        (source?.status?.publish_candidate ? 2 : 0) +
        approvedTopics.length +
        (source?.why_it_matters ? 1 : 0),
    });

    for (const [label, markdown] of Object.entries(markdownFiles)) {
      if (!markdown) continue;
      for (const target of getMarkdownLinks(markdown)) {
        const cleanTarget = target.split("#")[0];
        const candidate = path.resolve(path.dirname(path.join(sessionDir, `${label}.md`)), cleanTarget);
        if (!fs.existsSync(candidate)) {
          findings.push({
            severity: "warning",
            type: "broken_local_link",
            sessionId,
            path: `${relativePath}/${label}`,
            message: `Broken local Markdown link: ${target}`,
          });
        }
      }
    }
  }

  sessions.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt) || a.title.localeCompare(b.title));
  return { sessions, approvedTopicMap };
}

function buildTopics(sessions, approvedTopicMap, findings) {
  const topicIds = fs.existsSync(topicsRoot)
    ? fs
        .readdirSync(topicsRoot)
        .filter((entry) => fs.statSync(path.join(topicsRoot, entry)).isDirectory())
        .sort()
    : [];

  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const topics = [];

  for (const topicId of topicIds) {
    const indexPath = path.join(topicsRoot, topicId, "index.md");
    if (!fs.existsSync(indexPath)) {
      findings.push({
        severity: "error",
        type: "missing_topic_index",
        topicId,
        path: relativeToRoot(indexPath),
        message: "Topic directory is missing index.md.",
      });
      continue;
    }

    const markdown = readTextIfExists(indexPath);
    const sessionIds = approvedTopicMap.get(topicId) || [];
    const relatedSessions = sessionIds
      .map((sessionId) => sessionById.get(sessionId))
      .filter(Boolean)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    const refs = [
      ...new Set(
        markdown.match(/vault\/sessions\/\d{4}\/\d{2}\/[A-Za-z0-9._-]+\/?/g)?.map((ref) =>
          ref.replace(/\/$/, ""),
        ) || [],
      ),
    ];

    for (const ref of refs) {
      const matched = sessions.find((session) => session.path === ref);
      if (!matched) {
        findings.push({
          severity: "error",
          type: "archived_or_deleted_reference",
          topicId,
          path: relativeToRoot(indexPath),
          message: `Topic references a missing session path: ${ref}`,
        });
      } else if (!matched.topics.approved.includes(topicId)) {
        findings.push({
          severity: "warning",
          type: "topic_ref_not_approved_by_session",
          topicId,
          sessionId: matched.id,
          path: relativeToRoot(indexPath),
          message: "Topic index references a session that does not approve this topic in source.yaml.",
        });
      }
    }

    for (const session of relatedSessions) {
      if (!refs.includes(session.path)) {
        findings.push({
          severity: "warning",
          type: "missing_session_reference",
          topicId,
          sessionId: session.id,
          path: relativeToRoot(indexPath),
          message: "Session approves this topic, but topic index does not reference the session path.",
        });
      }
    }

    topics.push({
      id: topicId,
      title: topicId
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      path: relativeToRoot(indexPath),
      markdown: stripFrontmatter(markdown),
      sessionIds,
      sessions: relatedSessions.map((session) => ({
        id: session.id,
        title: session.title,
        capturedAt: session.capturedAt,
        path: session.path,
        healthStatus: session.health?.status || "ok",
      })),
      count: relatedSessions.length,
      latestDate: relatedSessions[0]?.capturedAt || "",
      summary: firstParagraph(markdown),
    });
  }

  for (const topicId of approvedTopicMap.keys()) {
    if (!topicIds.includes(topicId)) {
      findings.push({
        severity: "error",
        type: "missing_topic_directory",
        topicId,
        message: "Approved topic has no vault/topics/<topic-id>/ directory.",
      });
    }
  }

  topics.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  return topics;
}

function buildHealth(findings, sessions, topics) {
  const countsByType = {};
  const countsBySeverity = {};
  for (const finding of findings) {
    countsByType[finding.type] = (countsByType[finding.type] || 0) + 1;
    countsBySeverity[finding.severity] = (countsBySeverity[finding.severity] || 0) + 1;
  }

  return {
    generatedAt: now,
    source: "vault",
    summary: {
      status:
        (countsBySeverity.error || 0) > 0
          ? "error"
          : (countsBySeverity.warning || 0) > 0
            ? "warning"
            : "ok",
      totalFindings: findings.length,
      countsBySeverity,
      countsByType,
      sessions: sessions.length,
      topics: topics.length,
    },
    checks: [
      "missing_source_yaml",
      "missing_synthesis",
      "missing_session_reference",
      "archived_or_deleted_reference",
      "broken_local_link",
      "artifact_missing_path",
      "artifact_schema_warning",
    ],
    findings,
  };
}

function buildNotebookSnapshot(findings, hasSessions) {
  if (!fs.existsSync(notebooksPath)) {
    if (hasSessions) {
      findings.push({
        severity: "error",
        type: "missing_notebooks_yaml",
        path: relativeToRoot(notebooksPath),
        message: "vault/notebooklm/notebooks.yaml is missing.",
      });
    }
    return { notebooks: [] };
  }

  try {
    return yaml.load(fs.readFileSync(notebooksPath, "utf8")) || { notebooks: [] };
  } catch (error) {
    findings.push({
      severity: "error",
      type: "invalid_notebooks_yaml",
      path: relativeToRoot(notebooksPath),
      message: error.message,
    });
    return { notebooks: [] };
  }
}

function ensureOutputRoot() {
  fs.mkdirSync(outputRoot, { recursive: true });
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(outputRoot, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function main() {
  const findings = [];
  const { sessions, approvedTopicMap } = buildSessions(findings);
  const notebookSnapshot = buildNotebookSnapshot(findings, sessions.length > 0);
  const topics = buildTopics(sessions, approvedTopicMap, findings);

  for (const session of sessions) {
    session.health = sessionHealth(findings, session.id);
  }
  for (const topic of topics) {
    topic.sessions = topic.sessions.map((item) => ({
      ...item,
      healthStatus: sessions.find((session) => session.id === item.id)?.health.status || "ok",
    }));
  }

  const health = buildHealth(findings, sessions, topics);
  const snapshot = {
    generatedAt: now,
    source: "vault",
    truthLayer: "local vault",
    digestionEngine: "NotebookLM",
    monthRange: [...new Set(sessions.map((session) => session.month))].sort(),
    sessionsCount: sessions.length,
    topicsCount: topics.length,
    notebooksCount: Array.isArray(notebookSnapshot.notebooks) ? notebookSnapshot.notebooks.length : 0,
  };

  ensureOutputRoot();
  writeJson("sessions.json", { generatedAt: now, snapshot, sessions });
  writeJson("topics.json", { generatedAt: now, snapshot, topics });
  writeJson("health.json", health);

  console.log(
    `viewer data written: ${sessions.length} sessions, ${topics.length} topics, ${health.summary.totalFindings} health findings`,
  );
}

main();
