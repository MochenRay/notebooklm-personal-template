import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import yaml from "js-yaml";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const indexPath = path.join(root, "vault/notebooklm/audio-index.yaml");

function usage() {
  console.error("Usage: node scripts/backfill-audio-share-links.mjs [--exclude <session-dir>] [--dry-run]");
  process.exit(2);
}

function normalizeSessionPath(value) {
  return path.relative(root, path.resolve(root, value)).split(path.sep).join("/");
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    excludes: new Set(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--exclude") {
      const value = argv[index + 1];
      if (!value) usage();
      options.excludes.add(normalizeSessionPath(value));
      index += 1;
    } else {
      usage();
    }
  }

  return options;
}

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readIndex() {
  if (!fs.existsSync(indexPath)) {
    return { version: 1, updated_at: null, entries: [] };
  }
  const data = yaml.load(fs.readFileSync(indexPath, "utf8"));
  if (Array.isArray(data)) {
    return { version: 1, updated_at: null, entries: data.filter(ensureObject) };
  }
  const object = ensureObject(data);
  const entries = Array.isArray(object.entries)
    ? object.entries
    : Array.isArray(object.audio_index)
      ? object.audio_index
      : [];
  return {
    version: object.version || 1,
    updated_at: object.updated_at || null,
    entries: entries.filter(ensureObject),
  };
}

function writeIndex(index) {
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(
    indexPath,
    yaml.dump(index, { lineWidth: 120, noRefs: true, quotingType: '"' }),
    "utf8",
  );
}

function isPending(entry) {
  if (!entry.notebook_id || !entry.session_path) return false;
  if (entry.share_url) return false;
  return ["requested", "in_progress", "failed", "remote_completed_share_ready", "skipped"].includes(entry.status)
    ? ["requested", "in_progress", "failed"].includes(entry.status)
    : true;
}

function candidateSummary(entry) {
  return {
    session_id: entry.session_id || "",
    session_path: entry.session_path || "",
    notebook_id: entry.notebook_id || "",
    audio_artifact_id: entry.audio_artifact_id || "",
    status: entry.status || "missing",
    check_count: Number.isInteger(entry.check_count) ? entry.check_count : 0,
  };
}

async function runShareArtifacts(sessionPath) {
  const { stdout } = await execFileAsync(
    process.execPath,
    [path.join(root, "scripts/share-notebook-artifacts.mjs"), sessionPath],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    },
  );
  return stdout.trim() ? JSON.parse(stdout) : {};
}

function statusFromShareResult(result, previousStatus) {
  if (result.audio_share_url) return "remote_completed_share_ready";
  if (result.status === "audio_not_completed") {
    const statuses = String(result.audio_statuses || "");
    if (statuses.includes(":failed")) return "failed";
    if (statuses.includes(":in_progress") || statuses.includes(":pending")) return "in_progress";
    return "requested";
  }
  return previousStatus || "requested";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const index = readIndex();
  const now = new Date().toISOString();
  const candidates = index.entries
    .filter(isPending)
    .filter((entry) => !options.excludes.has(normalizeSessionPath(entry.session_path)))
    .map(candidateSummary);

  if (options.dryRun) {
    console.log(JSON.stringify({ dry_run: true, index: path.relative(root, indexPath), candidates }, null, 2));
    return;
  }

  const results = [];
  for (const entry of index.entries) {
    if (!isPending(entry) || options.excludes.has(normalizeSessionPath(entry.session_path))) continue;
    const previousStatus = entry.status || "requested";
    entry.last_checked_at = now;
    entry.check_count = Number.isInteger(entry.check_count) ? entry.check_count + 1 : 1;
    try {
      const result = await runShareArtifacts(entry.session_path);
      entry.status = statusFromShareResult(result, previousStatus);
      entry.audio_artifact_id = result.audio_artifact_id || entry.audio_artifact_id || "";
      entry.share_url = result.audio_share_url || entry.share_url || "";
      entry.next_check_after = entry.share_url ? "" : entry.next_check_after || "";
      results.push({ ...candidateSummary(entry), result });
    } catch (error) {
      entry.status = "failed";
      entry.last_error = error instanceof Error ? error.message : String(error);
      results.push({ ...candidateSummary(entry), error: entry.last_error });
    }
  }

  index.updated_at = now;
  writeIndex(index);
  console.log(JSON.stringify({ checked: results.length, index: path.relative(root, indexPath), results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
