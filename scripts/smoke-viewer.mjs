import { existsSync, mkdirSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const root = process.cwd();
const screenshotDir = path.join(root, ".viewer-data", "screenshots");
const sessionId = "software-fundamentals-matter-more-than-ever-matt-pocock";
const topicId = "ai-workflow-design";
const chromeExecutable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function findFreePort(start = 5173) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", () => {
      findFreePort(start + 1).then(resolve, reject);
    });
    server.listen(start, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url, child) {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    if (child.exitCode !== null) {
      throw new Error(`dev server exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (overflow.scrollWidth > overflow.width + 2) {
    throw new Error(`${label} horizontal overflow: ${overflow.scrollWidth} > ${overflow.width}`);
  }
}

async function main() {
  mkdirSync(screenshotDir, { recursive: true });
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );

  let serverLog = "";
  server.stdout.on("data", (chunk) => {
    serverLog += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverLog += chunk.toString();
  });

  try {
    await waitForServer(baseUrl, server);
    const browser = await chromium.launch({
      headless: true,
      executablePath: existsSync(chromeExecutable) ? chromeExecutable : undefined,
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

    await page.goto(`${baseUrl}/#/`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "个人知识库概览" }).waitFor();
    await page.screenshot({ path: path.join(screenshotDir, "overview-desktop.png"), fullPage: true });

    await page.goto(`${baseUrl}/#/sessions`, { waitUntil: "networkidle" });
    await page.getByPlaceholder("Search sessions...").fill("software");
    await page.getByRole("heading", { name: /Software Fundamentals/ }).waitFor();

    await page.goto(`${baseUrl}/#/sessions/${sessionId}`, { waitUntil: "networkidle" });
    await page.locator(".reader-header h1").filter({ hasText: "Software Fundamentals" }).waitFor();
    const bodyText = await page.locator("body").innerText();
    if (bodyText.includes("origin: agent-synthesis") || bodyText.includes("card_type: reusable-knowledge")) {
      throw new Error("frontmatter is visible in session detail");
    }
    const rawPracticePreCount = await page.locator("#practice pre").count();
    if (rawPracticePreCount > 0) {
      throw new Error("practice artifacts contain raw pre blocks");
    }
    await page.screenshot({ path: path.join(screenshotDir, "session-detail-desktop.png"), fullPage: true });

    await page.goto(`${baseUrl}/#/topics/${topicId}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: topicId }).waitFor();

    await page.goto(`${baseUrl}/#/health`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Vault Health" }).waitFor();
    await page.getByText("multiple_source_ids").waitFor();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/#/sessions`, { waitUntil: "networkidle" });
    await assertNoHorizontalOverflow(page, "mobile sessions");
    await page.screenshot({ path: path.join(screenshotDir, "sessions-mobile.png"), fullPage: true });

    await browser.close();
    console.log(`smoke passed at ${baseUrl}`);
    console.log(`screenshots: ${path.relative(root, screenshotDir)}`);
  } catch (error) {
    console.error(serverLog);
    throw error;
  } finally {
    server.kill("SIGTERM");
  }
}

main();
