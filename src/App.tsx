import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  FileText,
  FolderOpen,
  GitBranch,
  HeartPulse,
  Home,
  Layers3,
  NotebookTabs,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { marked } from "marked";
import { useEffect, useMemo, useState } from "react";
import {
  allTopicIds,
  healthData,
  latestMonth,
  sessionById,
  sessions,
  snapshot,
  topicById,
  topics,
} from "./data";
import { href, parseRoute } from "./router";
import type {
  HealthFinding,
  HealthStatus,
  MindmapNode,
  Route,
  VaultSession,
  VaultTopic,
} from "./types";

const navItems = [
  { href: "/", label: "概览", icon: Home, match: ["overview"] },
  { href: "/sessions", label: "Sessions", icon: CalendarDays, match: ["sessions", "session"] },
  { href: "/topics", label: "Topics", icon: GitBranch, match: ["topics", "topic"] },
  { href: "/health", label: "Health", icon: HeartPulse, match: ["health"] },
];

const sectionGroups = [
  {
    id: "reading",
    label: "Reading",
    icon: BookOpen,
    items: [{ id: "synthesis", label: "synthesis.md" }],
  },
  {
    id: "notebooklm",
    label: "NotebookLM",
    icon: NotebookTabs,
    items: [
      { id: "report", label: "report.md" },
      { id: "topology", label: "topology.md" },
    ],
  },
  {
    id: "notes",
    label: "Notes",
    icon: FileText,
    items: [
      { id: "questions", label: "questions.md" },
      { id: "my-notes", label: "my-notes.md" },
      { id: "debate", label: "debate.md" },
      { id: "process-log", label: "process-log.md" },
    ],
  },
  {
    id: "practice",
    label: "Practice",
    icon: Sparkles,
    items: [
      { id: "flashcards", label: "flashcards" },
      { id: "quiz", label: "quiz" },
      { id: "mindmap", label: "mindmap" },
    ],
  },
];

function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const activeName = route.name === "session" ? "session" : route.name === "topic" ? "topic" : route.name;

  return (
    <div className="app-shell">
      <Sidebar route={activeName} />
      <main className="main-plane">{renderRoute(route)}</main>
      <RightRail route={route} />
    </div>
  );
}

function renderRoute(route: Route) {
  if (route.name === "overview") return <Overview />;
  if (route.name === "sessions") return <SessionsPage />;
  if (route.name === "topics") return <TopicsPage />;
  if (route.name === "health") return <HealthPage />;
  if (route.name === "session") {
    const session = sessionById.get(route.id);
    return session ? <SessionDetail session={session} /> : <NotFound label="session" value={route.id} />;
  }
  if (route.name === "topic") {
    const topic = topicById.get(route.id);
    return topic ? <TopicDetail topic={topic} /> : <NotFound label="topic" value={route.id} />;
  }
  return <NotFound label="route" value={route.path} />;
}

function Sidebar({ route }: { route: string }) {
  return (
    <aside className="sidebar" aria-label="Vault navigation">
      <a className="brand" href={href("/")}>
        <span className="brand-mark">
          <Layers3 size={21} strokeWidth={1.8} />
        </span>
        <span>
          <strong>Vault Viewer</strong>
          <em>local vault = truth layer</em>
        </span>
      </a>
      <nav className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.match.includes(route);
          return (
            <a className={active ? "nav-link active" : "nav-link"} href={href(item.href)} key={item.href}>
              <Icon size={19} strokeWidth={1.8} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

function RightRail({ route }: { route: Route }) {
  const session = route.name === "session" ? sessionById.get(route.id) : undefined;
  const topic = route.name === "topic" ? topicById.get(route.id) : undefined;

  return (
    <aside className="right-rail" aria-label="Vault snapshot">
      {session ? <SessionSnapshot session={session} /> : topic ? <TopicSnapshot topic={topic} /> : <VaultSnapshot />}
    </aside>
  );
}

function Overview() {
  const recentSessions = sessions.slice(0, 6);
  const topTopics = [...topics].sort((left, right) => right.count - left.count).slice(0, 7);
  const reread = [...sessions].sort((left, right) => right.rereadScore - left.rereadScore).slice(0, 4);
  const isEmpty = sessions.length === 0;

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="crumb">Vault Viewer / Overview</p>
        <h1>个人知识库概览</h1>
      </header>

      <section className="metric-strip" aria-label="Vault metrics">
        <Metric label="本月学习脉络" value={latestMonth || "none"} />
        <Metric label="学习记录" value={`${snapshot.sessionsCount} 条`} />
        <Metric label="Topics" value={`${snapshot.topicsCount} 个`} />
        <Metric
          label="健康提醒"
          value={`${healthData.summary.totalFindings} 条`}
          tone={healthData.summary.status === "ok" ? "good" : "warn"}
        />
        <Metric label="重点增长" value={topics[0]?.id ?? "none"} />
      </section>

      {isEmpty ? (
        <EmptyVaultState />
      ) : (
        <section>
          <SectionTitle title="最近学习" subtitle="从 source.yaml 读取，全局 session 真理字典" />
          <div className="session-table">
            <div className="table-row table-head">
              <span>Title</span>
              <span>Date</span>
              <span>Topics</span>
              <span>Status</span>
            </div>
            {recentSessions.map((session) => (
              <a className="table-row" href={href(`/sessions/${session.id}`)} key={session.id}>
                <strong>{session.title}</strong>
                <span>{session.capturedAt}</span>
                <span className="topic-cell">
                  {session.topics.approved.slice(0, 2).map((topicId) => (
                    <TopicPill id={topicId} key={topicId} />
                  ))}
                </span>
                <StatusIcon status={session.health.status} />
              </a>
            ))}
          </div>
        </section>
      )}

      {!isEmpty ? <div className="dashboard-grid">
        <section>
          <SectionTitle title="Topic Growth" subtitle="关系由 sessions.source.yaml.topics.approved 反推" />
          <div className="growth-panel">
            {topTopics.map((topic) => (
              <a className="growth-row" href={href(`/topics/${topic.id}`)} key={topic.id}>
                <span>{topic.id}</span>
                <small>
                  {topic.count} sessions {topic.latestDate ? `/ ${topic.latestDate}` : ""}
                </small>
                <span className="growth-bar">
                  <i style={{ width: `${Math.max(8, (topic.count / Math.max(1, topTopics[0].count)) * 100)}%` }} />
                </span>
              </a>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title="值得复读" subtitle="publish candidate、topic 密度与 why_it_matters 加权" />
          <div className="reread-list">
            {reread.map((session) => (
              <a href={href(`/sessions/${session.id}`)} key={session.id}>
                <span>{session.title}</span>
                <small>{session.topics.approved.slice(0, 3).join(" / ")}</small>
              </a>
            ))}
          </div>
        </section>
      </div> : null}
    </div>
  );
}

function SessionsPage() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [health, setHealth] = useState("all");
  const [coverage, setCoverage] = useState("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const text = `${session.title} ${session.author} ${session.content.summary} ${session.topics.approved.join(" ")}`.toLowerCase();
      const matchesQuery = !needle || text.includes(needle);
      const matchesTopic = topic === "all" || session.topics.approved.includes(topic);
      const matchesHealth = health === "all" || session.health.status === health;
      const matchesCoverage =
        coverage === "all" ||
        (coverage === "complete" && session.notebooklm.artifactCoverage.complete) ||
        (coverage === "incomplete" && !session.notebooklm.artifactCoverage.complete);
      return matchesQuery && matchesTopic && matchesHealth && matchesCoverage;
    });
  }, [query, topic, health, coverage]);

  return (
    <div className="page-stack">
      <header className="page-header with-search">
        <div>
          <p className="crumb">Vault Viewer / Sessions</p>
          <h1>Sessions</h1>
          <p>{snapshot.sessionsCount} learning sessions / {latestMonth} / local vault = truth layer</p>
        </div>
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sessions..."
            aria-label="Search sessions"
          />
        </label>
      </header>

      <div className="filter-bar" aria-label="Session filters">
        <select value={topic} onChange={(event) => setTopic(event.target.value)} aria-label="Topic filter">
          <option value="all">Topic</option>
          {allTopicIds.map((topicId) => (
            <option value={topicId} key={topicId}>
              {topicId}
            </option>
          ))}
        </select>
        <select value={health} onChange={(event) => setHealth(event.target.value)} aria-label="Health filter">
          <option value="all">Health</option>
          <option value="ok">OK</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <select value={coverage} onChange={(event) => setCoverage(event.target.value)} aria-label="Artifact filter">
          <option value="all">Artifacts</option>
          <option value="complete">Complete</option>
          <option value="incomplete">Incomplete</option>
        </select>
        <span className="result-count">{filtered.length} shown</span>
      </div>

      <div className="session-list">
        {filtered.length ? filtered.map((session) => (
          <SessionCard session={session} key={session.id} />
        )) : <EmptyList label="暂无 sessions" detail="空 vault 是公开模板仓的正常状态。导入学习 session 后，此处会显示检索列表。" />}
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: VaultSession }) {
  return (
    <article className="session-card">
      <a href={href(`/sessions/${session.id}`)} className="card-main-link">
        <div>
          <h2>{session.title}</h2>
          <p>
            <CalendarDays size={15} /> {session.capturedAt}
            <span> / </span>
            <FolderOpen size={15} /> {session.sourceType}
          </p>
        </div>
        <StatusIcon status={session.health.status} />
      </a>
      <p className="session-summary">{session.content.summary || session.whyItMatters}</p>
      <div className="pill-row">
        {session.topics.approved.map((topicId) => (
          <TopicPill id={topicId} key={topicId} />
        ))}
      </div>
      <div className="artifact-line">
        <span>{session.notebooklm.artifactCoverage.presentCount}/{session.notebooklm.artifactCoverage.declaredCount} artifacts</span>
        <span>{session.status.stage}</span>
      </div>
    </article>
  );
}

function SessionDetail({ session }: { session: VaultSession }) {
  return (
    <div className="session-detail">
      <nav className="session-toc" aria-label="Session sections">
        <p>本 SESSION</p>
        {sectionGroups.map((group) => {
          const Icon = group.icon;
          return (
            <div className="toc-group" key={group.id}>
              <a href={`#${group.id}`}>
                <Icon size={17} />
                <span>{group.label}</span>
              </a>
              <div>
                {group.items.map((item) => (
                  <a href={`#${item.id}`} key={item.id}>{item.label}</a>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <article className="reader-column">
        <div className="breadcrumbs">
          <a href={href("/sessions")}>Sessions</a>
          <ChevronRight size={14} />
          <span>{session.id}</span>
        </div>
        <header className="reader-header">
          <h1>{session.title}</h1>
          <p>
            <CalendarDays size={17} /> {session.capturedAt}
            <span>/</span>
            <FolderOpen size={17} /> {session.path}
          </p>
          <div className="pill-row">
            {session.topics.approved.map((topicId) => (
              <TopicPill id={topicId} key={topicId} />
            ))}
          </div>
        </header>

        <section id="reading" className="reader-section">
          <SectionTitle title="Reading" subtitle="synthesis.md" />
          <MarkdownView markdown={session.content.synthesis} />
        </section>

        <section id="notebooklm" className="reader-section">
          <SectionTitle title="NotebookLM" subtitle="report.md / topology.md" />
          <ContentBlock id="report" title="report.md" markdown={session.content.report} />
          <ContentBlock id="topology" title="topology.md" markdown={session.content.topology} />
        </section>

        <section id="notes" className="reader-section">
          <SectionTitle title="Notes" subtitle="questions / my-notes / debate / process-log" />
          <ContentBlock id="questions" title="questions.md" markdown={session.content.questions} />
          <ContentBlock id="my-notes" title="my-notes.md" markdown={session.content.myNotes} />
          <ContentBlock id="debate" title="debate.md" markdown={session.content.debate} />
          <ContentBlock id="process-log" title="process-log.md" markdown={session.content.processLog} />
        </section>

        <section id="practice" className="reader-section">
          <SectionTitle title="Practice" subtitle="flashcards / quiz / mindmap" />
          <PracticePanel session={session} />
        </section>
      </article>
    </div>
  );
}

function ContentBlock({ id, title, markdown }: { id: string; title: string; markdown: string }) {
  return (
    <div className="content-block" id={id}>
      <h3>{title}</h3>
      <MarkdownView markdown={markdown} />
    </div>
  );
}

function TopicsPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="crumb">Vault Viewer / Topics</p>
        <h1>Topics</h1>
        <p>从每条 session 的 approved topics 反向生成，不解析 topic Markdown 链接作真相。</p>
      </header>
      <div className="topic-grid">
        {topics.length ? topics.map((topic) => (
          <a className="topic-card" href={href(`/topics/${topic.id}`)} key={topic.id}>
            <span className="topic-count">{topic.count}</span>
            <h2>{topic.id}</h2>
            <p>{topic.summary || "暂无 topic 正文摘要。"}</p>
            <small>{topic.latestDate || "no sessions"}</small>
          </a>
        )) : <EmptyList label="暂无 topics" detail="topics 会由每条 session 的 source.yaml.topics.approved 反向生成。" />}
      </div>
    </div>
  );
}

function TopicDetail({ topic }: { topic: VaultTopic }) {
  return (
    <div className="page-stack detail-narrow">
      <div className="breadcrumbs">
        <a href={href("/topics")}>Topics</a>
        <ChevronRight size={14} />
        <span>{topic.id}</span>
      </div>
      <header className="page-header">
        <h1>{topic.id}</h1>
        <p>{topic.count} sessions / latest {topic.latestDate || "none"}</p>
      </header>
      <section>
        <SectionTitle title="Topic Understanding" subtitle={topic.path} />
        <MarkdownView markdown={topic.markdown} />
      </section>
      <section>
        <SectionTitle title="关联 Sessions" subtitle="derived from approved topics" />
        <div className="linked-session-list">
          {topic.sessions.map((session) => (
            <a href={href(`/sessions/${session.id}`)} key={session.id}>
              <span>{session.title}</span>
              <small>{session.capturedAt}</small>
              <StatusIcon status={session.healthStatus} />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function HealthPage() {
  const groups = groupFindings(healthData.findings);
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="crumb">Vault Viewer / Health</p>
        <h1>Vault Health</h1>
        <p>影响后续复盘的一致性检查，不以空泛健康分替代具体 finding。</p>
      </header>
      <section className="metric-strip">
        <Metric label="Status" value={healthData.summary.status} tone={healthData.summary.status === "ok" ? "good" : "warn"} />
        <Metric label="Findings" value={String(healthData.summary.totalFindings)} />
        <Metric label="Errors" value={String(healthData.summary.countsBySeverity.error ?? 0)} tone="danger" />
        <Metric label="Warnings" value={String(healthData.summary.countsBySeverity.warning ?? 0)} tone="warn" />
      </section>
      <div className="health-groups">
        {Object.entries(groups).map(([type, findings]) => (
          <section className="health-group" key={type}>
            <h2>{type}</h2>
            {findings.map((finding, index) => (
              <FindingCard finding={finding} key={`${type}-${index}`} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function PracticePanel({ session }: { session: VaultSession }) {
  const { flashcards, quiz, mindmap } = session.practice;
  return (
    <div className="practice-stack">
      {flashcards ? (
        <section className="practice-block" id="flashcards">
          <h3>{flashcards.title}</h3>
          <div className="flashcard-grid">
            {flashcards.cards.slice(0, 12).map((card, index) => (
              <article className="flashcard" key={`${card.front}-${index}`}>
                <strong>{card.front}</strong>
                <p>{card.back}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {quiz ? (
        <section className="practice-block" id="quiz">
          <h3>{quiz.title}</h3>
          <div className="quiz-list">
            {quiz.questions.slice(0, 6).map((question, index) => (
              <article className="quiz-card" key={`${question.question}-${index}`}>
                <h4>{index + 1}. {question.question}</h4>
                {question.hint ? <p className="hint"><CircleHelp size={15} /> {question.hint}</p> : null}
                <div className="answer-list">
                  {question.answerOptions.map((option) => (
                    <div className={option.isCorrect ? "answer correct" : "answer"} key={option.text}>
                      <span>{option.isCorrect ? "Correct" : "Option"}</span>
                      <p>{option.text}</p>
                      {option.rationale ? <small>{option.rationale}</small> : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {mindmap ? (
        <section className="practice-block" id="mindmap">
          <h3>{mindmap.name}</h3>
          <MindmapTree node={mindmap} />
        </section>
      ) : null}
    </div>
  );
}

function MindmapTree({ node }: { node: MindmapNode }) {
  return (
    <ul className="mindmap-tree">
      <li>
        <span>{node.name}</span>
        {node.children?.length ? (
          <div>
            {node.children.map((child, index) => (
              <MindmapTree node={child} key={`${child.name}-${index}`} />
            ))}
          </div>
        ) : null}
      </li>
    </ul>
  );
}

function VaultSnapshot() {
  return (
    <div className="rail-stack">
      <RailTitle title="VAULT SNAPSHOT" />
      <dl className="rail-list">
        <dt>Data source</dt>
        <dd>.viewer-data/</dd>
        <dt>Truth layer</dt>
        <dd>{snapshot.truthLayer}</dd>
        <dt>Digestion engine</dt>
        <dd>{snapshot.digestionEngine}</dd>
      </dl>
      <dl className="rail-list compact">
        <dt>Sessions</dt>
        <dd>{snapshot.sessionsCount}</dd>
        <dt>Topics</dt>
        <dd>{snapshot.topicsCount}</dd>
        <dt>Health findings</dt>
        <dd className={healthData.summary.status === "ok" ? "good-text" : "warn-text"}>
          {healthData.summary.totalFindings}
        </dd>
        <dt>Latest month</dt>
        <dd>{latestMonth}</dd>
      </dl>
    </div>
  );
}

function SessionSnapshot({ session }: { session: VaultSession }) {
  return (
    <div className="rail-stack">
      <RailTitle title="SESSION SNAPSHOT" />
      <div className="snapshot-card dashed">
        <FileText size={18} />
        <span>source.yaml</span>
        <b>TRUTH</b>
      </div>
      <div className="snapshot-card">
        <BookOpen size={18} />
        <span>synthesis.md</span>
        <b>MAIN CARD</b>
      </div>
      <div className="snapshot-card">
        <NotebookTabs size={18} />
        <span>NotebookLM</span>
        <b>ENGINE</b>
      </div>
      <div className="mini-grid">
        <span>Health <b>{session.health.status}</b></span>
        <span>Artifacts <b>{session.notebooklm.artifactCoverage.complete ? "complete" : "partial"}</b></span>
      </div>
      <div>
        <h3 className="rail-subhead">Artifact Coverage List</h3>
        <div className="coverage-list">
          {session.notebooklm.artifactCoverage.items.map((item) => (
            <span key={`${item.artifactType}-${item.format ?? "path"}`}>
              <CheckCircle2 size={16} />
              {item.localPath}
            </span>
          ))}
        </div>
      </div>
      <div>
        <h3 className="rail-subhead">Topic links</h3>
        <div className="pill-row">
          {session.topics.approved.map((topicId) => (
            <TopicPill id={topicId} key={topicId} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TopicSnapshot({ topic }: { topic: VaultTopic }) {
  return (
    <div className="rail-stack">
      <RailTitle title="TOPIC SNAPSHOT" />
      <dl className="rail-list compact">
        <dt>Topic</dt>
        <dd>{topic.id}</dd>
        <dt>Sessions</dt>
        <dd>{topic.count}</dd>
        <dt>Latest</dt>
        <dd>{topic.latestDate || "none"}</dd>
        <dt>Source</dt>
        <dd>approved topics</dd>
      </dl>
      <div className="linked-session-list compact-list">
        {topic.sessions.slice(0, 8).map((session) => (
          <a href={href(`/sessions/${session.id}`)} key={session.id}>
            <span>{session.title}</span>
            <small>{session.capturedAt}</small>
          </a>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "danger" }) {
  return (
    <div className={`metric ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyVaultState() {
  return (
    <section className="empty-state">
      <div>
        <Tag size={22} />
        <h2>Vault 目前为空</h2>
      </div>
      <p>
        这是公开模板仓的默认状态。工具、文档、脚本和 Viewer 可开源；真实 digest 内容应在 private
        living instance 的 `vault/` 中维护。
      </p>
      <ol>
        <li>用 NotebookLM Pipeline 生成 session。</li>
        <li>写入 `vault/sessions/YYYY/MM/&lt;session-id&gt;/source.yaml` 与 `synthesis.md`。</li>
        <li>运行 `npm run build:data` 后刷新 Viewer。</li>
      </ol>
    </section>
  );
}

function EmptyList({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="empty-state compact-empty">
      <h2>{label}</h2>
      <p>{detail}</p>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

function MarkdownView({ markdown }: { markdown: string }) {
  const html = useMemo(() => {
    const cleaned = markdown.replace(/^---[\s\S]*?---\s*/, "").trim();
    return marked.parse(cleaned || "_暂无内容_", { async: false }) as string;
  }, [markdown]);

  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}

function TopicPill({ id }: { id: string }) {
  return (
    <a className="topic-pill" href={href(`/topics/${id}`)}>
      {id}
    </a>
  );
}

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === "ok") return <CheckCircle2 className="status-icon ok" size={19} aria-label="ok" />;
  if (status === "warning") return <AlertTriangle className="status-icon warning" size={19} aria-label="warning" />;
  return <AlertTriangle className="status-icon error" size={19} aria-label="error" />;
}

function RailTitle({ title }: { title: string }) {
  return <h2 className="rail-title">{title}</h2>;
}

function FindingCard({ finding }: { finding: HealthFinding }) {
  return (
    <article className={`finding-card ${finding.severity}`}>
      <div>
        <StatusIcon status={finding.severity === "error" ? "error" : finding.severity === "warning" ? "warning" : "ok"} />
        <strong>{finding.message}</strong>
      </div>
      <p>
        {finding.sessionId ? `session: ${finding.sessionId}` : ""}
        {finding.topicId ? `topic: ${finding.topicId}` : ""}
      </p>
      {finding.path ? <small>{finding.path}</small> : null}
    </article>
  );
}

function NotFound({ label, value }: { label: string; value: string }) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="crumb">Vault Viewer / Missing</p>
        <h1>未找到 {label}</h1>
        <p>{value}</p>
      </header>
      <a className="text-link" href={href("/")}>回概览</a>
    </div>
  );
}

function groupFindings(findings: HealthFinding[]) {
  return findings.reduce<Record<string, HealthFinding[]>>((groups, finding) => {
    if (!groups[finding.type]) groups[finding.type] = [];
    groups[finding.type].push(finding);
    return groups;
  }, {});
}

export default App;
