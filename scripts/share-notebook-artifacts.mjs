import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import yaml from "js-yaml";

const execFileAsync = promisify(execFile);

function usage() {
  console.error("Usage: node scripts/share-notebook-artifacts.mjs <session-dir|source.yaml>");
  process.exit(2);
}

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function artifactShareUrl(notebookId, artifactId) {
  return `https://notebooklm.google.com/notebook/${notebookId}/artifact/${artifactId}`;
}

async function runNlm(args) {
  const { stdout } = await execFileAsync("nlm", args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
  });
  return stdout.trim();
}

async function runNlmJson(args) {
  const output = await runNlm(args);
  return JSON.parse(output);
}

function resolveSourcePath(inputPath) {
  const absolute = path.resolve(process.cwd(), inputPath);
  if (path.basename(absolute) === "source.yaml") {
    return absolute;
  }
  return path.join(absolute, "source.yaml");
}

function mergeArtifactStatus(existing, studioArtifacts, notebookId) {
  const existingById = new Map(
    Array.isArray(existing?.artifacts) ? existing.artifacts.map((item) => [item.id, item]) : [],
  );

  return studioArtifacts.map((artifact) => ({
    ...ensureObject(existingById.get(artifact.id)),
    id: artifact.id,
    type: artifact.type,
    status: artifact.status,
    share_url: artifactShareUrl(notebookId, artifact.id),
  }));
}

async function main() {
  const [inputPath] = process.argv.slice(2);
  if (!inputPath) usage();

  const sourcePath = resolveSourcePath(inputPath);
  const sessionDir = path.dirname(sourcePath);
  const source = yaml.load(fs.readFileSync(sourcePath, "utf8"));
  const notebooklm = ensureObject(source?.notebooklm);
  const notebookId = notebooklm.notebook_id;
  const profile = notebooklm.profile || "learning";

  if (!notebookId) {
    throw new Error(`Missing notebooklm.notebook_id in ${sourcePath}`);
  }

  await runNlm(["share", "public", "--profile", profile, notebookId]);

  const [shareStatus, studioArtifacts] = await Promise.all([
    runNlmJson(["share", "status", "--profile", profile, notebookId, "--json"]),
    runNlmJson(["studio", "status", "--profile", profile, notebookId, "--json"]),
  ]);

  const artifacts = Array.isArray(studioArtifacts) ? studioArtifacts : [];
  const currentAudioId = notebooklm.artifacts?.audio?.id;
  const audioArtifact =
    artifacts.find((artifact) => artifact.type === "audio" && artifact.id === currentAudioId) ??
    artifacts.find((artifact) => artifact.type === "audio" && artifact.status === "completed") ??
    artifacts.find((artifact) => artifact.type === "audio");

  if (!audioArtifact) {
    throw new Error(`No audio artifact found for notebook ${notebookId}`);
  }

  const updatedAt = new Date().toISOString();

  source.notebooklm = notebooklm;
  source.notebooklm.sharing = {
    access: shareStatus.access_level || (shareStatus.is_public ? "public" : "restricted"),
    is_public: Boolean(shareStatus.is_public),
    public_link: shareStatus.public_link || `https://notebooklm.google.com/notebook/${notebookId}`,
    artifact_link_policy: "default_public",
    updated_at: updatedAt,
    note: "NotebookLM artifact URLs require notebook public link access; the pipeline defaults to public link access for playable artifacts.",
  };

  source.notebooklm.artifacts = ensureObject(source.notebooklm.artifacts);
  source.notebooklm.artifacts.audio = {
    ...ensureObject(source.notebooklm.artifacts.audio),
    id: audioArtifact.id,
    status: audioArtifact.status === "completed" ? "remote_completed_share_ready" : audioArtifact.status,
    share_url: artifactShareUrl(notebookId, audioArtifact.id),
    public_access_required: true,
  };

  source.status = ensureObject(source.status);
  if (audioArtifact.status === "completed") {
    source.status.stage = "synthesized_audio_share_ready";
  }

  if (!("downloaded" in source.notebooklm.artifacts.audio)) {
    source.notebooklm.artifacts.audio.downloaded = false;
  }
  if (!source.notebooklm.artifacts.audio.path && !source.notebooklm.artifacts.audio.target_path) {
    source.notebooklm.artifacts.audio.target_path = "notebooklm/artifacts/audio.m4a";
  }

  const dumped = yaml.dump(source, {
    lineWidth: 120,
    noRefs: true,
    quotingType: '"',
  });
  fs.writeFileSync(sourcePath, dumped, "utf8");

  const artifactStatusPath = path.join(sessionDir, "notebooklm/artifacts/artifact-status.json");
  let artifactStatus = {};
  if (fs.existsSync(artifactStatusPath)) {
    artifactStatus = JSON.parse(fs.readFileSync(artifactStatusPath, "utf8"));
  }
  artifactStatus.notebook_id = notebookId;
  artifactStatus.checked_at = updatedAt;
  artifactStatus.sharing = {
    access: source.notebooklm.sharing.access,
    is_public: source.notebooklm.sharing.is_public,
    public_link: source.notebooklm.sharing.public_link,
    updated_at: updatedAt,
  };
  artifactStatus.artifacts = mergeArtifactStatus(artifactStatus, artifacts, notebookId);
  fs.writeFileSync(artifactStatusPath, `${JSON.stringify(artifactStatus, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        notebook_id: notebookId,
        public_link: source.notebooklm.sharing.public_link,
        audio_artifact_id: audioArtifact.id,
        audio_share_url: source.notebooklm.artifacts.audio.share_url,
        source_yaml: path.relative(process.cwd(), sourcePath),
        artifact_status: path.relative(process.cwd(), artifactStatusPath),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
