import {
  AlertTriangle,
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
import ForceGraph2D, { type ForceGraphMethods, type GraphData, type LinkObject, type NodeObject } from "react-force-graph-2d";
import { useEffect, useMemo, useRef, useState } from "react";
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
  HealthSeverity,
  HealthStatus,
  MindmapNode,
  Route,
  VaultSession,
  VaultTopic,
} from "./types";

const navItems = [
  { href: "/", label: "概览", icon: Home, match: ["overview"] },
  { href: "/sessions", label: "学习记录", icon: CalendarDays, match: ["sessions", "session"] },
  { href: "/topics", label: "主题地图", icon: GitBranch, match: ["topics", "topic"] },
  { href: "/health", label: "健康检查", icon: HeartPulse, match: ["health"] },
];

const sectionGroups = [
  {
    id: "reading",
    label: "阅读",
    icon: BookOpen,
    items: [{ id: "synthesis", label: "知识卡片" }],
  },
  {
    id: "notebooklm",
    label: "NotebookLM 输出",
    icon: NotebookTabs,
    items: [
      { id: "report", label: "学习报告" },
      { id: "topology", label: "知识拓扑" },
    ],
  },
  {
    id: "notes",
    label: "笔记",
    icon: FileText,
    items: [
      { id: "questions", label: "追问" },
      { id: "my-notes", label: "我的笔记" },
      { id: "debate", label: "辩论记录" },
      { id: "process-log", label: "过程日志" },
    ],
  },
  {
    id: "practice",
    label: "练习",
    icon: Sparkles,
    items: [
      { id: "flashcards", label: "抽认卡" },
      { id: "quiz", label: "测验" },
      { id: "mindmap", label: "思维导图" },
    ],
  },
];

type SessionSort = "latest" | "reread" | "health" | "artifacts";
type KnowledgeNodeKind = "topic" | "session";
type KnowledgeGraphNode = {
  id: string;
  entityId: string;
  label: string;
  kind: KnowledgeNodeKind;
  count: number;
  date?: string;
  health?: HealthStatus;
  target: string;
};
type KnowledgeGraphLink = {
  source: string;
  target: string;
};

const healthOrder: Record<HealthStatus, number> = {
  error: 0,
  warning: 1,
  ok: 2,
};

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
      <Sidebar route={activeName} currentRoute={route} />
      <main className="main-plane">{renderRoute(route)}</main>
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

function Sidebar({ route, currentRoute }: { route: string; currentRoute: Route }) {
  const showSessionToc = currentRoute.name === "session" && sessionById.has(currentRoute.id);

  return (
    <aside className="sidebar" aria-label="Vault navigation">
      <a className="brand" href={href("/")}>
        <span className="brand-mark">
          <Layers3 size={21} strokeWidth={1.8} />
        </span>
        <span>
          <strong>Vault Viewer</strong>
          <em>本机知识库工作台</em>
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
      {showSessionToc ? <SessionToc /> : null}
    </aside>
  );
}

function SessionToc() {
  return (
    <nav className="session-toc" aria-label="本页目录">
      <p>本页目录</p>
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
  );
}

function Overview() {
  const recentSessions = sessions.slice(0, 6);
  const topTopics = [...topics].sort((left, right) => right.count - left.count).slice(0, 7);
  const isEmpty = sessions.length === 0;

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="crumb">本机知识库 / 概览</p>
        <h1>个人知识库概览</h1>
        <p className="page-intent">
          NotebookLM 负责消化材料，本机知识库保存可追溯记录，最终沉淀成可复用知识卡片。
        </p>
      </header>

      <section className="metric-strip" aria-label="Vault metrics">
        <Metric label="最新学习月份" value={latestMonth || "none"} />
        <Metric label="学习记录" value={`${snapshot.sessionsCount} 条`} />
        <Metric label="主题" value={`${snapshot.topicsCount} 个`} />
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
        <section className="workbench-board">
          <KnowledgeGraphPanel />
        </section>
      )}

      {!isEmpty ? <div className="dashboard-grid">
        <section>
          <SectionTitle title="学习流入" subtitle="最近沉淀到本机知识库的学习记录" />
          <div className="compact-session-list flow-list">
            {recentSessions.map((session) => (
              <a className="compact-session-row" href={href(`/sessions/${session.id}`)} key={session.id}>
                <span>
                  <strong>{session.title}</strong>
                  <small>{session.content.summary || session.whyItMatters}</small>
                </span>
                <em>{session.capturedAt}</em>
                <StatusIcon status={session.health.status} />
              </a>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title="主题增长" subtitle="按学习记录里标注的主题统计，越长代表出现越多。" />
          <div className="growth-panel">
            {topTopics.map((topic) => (
              <a className="growth-row" href={href(`/topics/${topic.id}`)} key={topic.id}>
                <span>{topic.id}</span>
                <small>
                  {topic.count} 条记录{topic.latestDate ? ` / 最新 ${topic.latestDate}` : ""}
                </small>
                <span className="growth-bar">
                  <i style={{ width: `${Math.max(8, (topic.count / Math.max(1, topTopics[0].count)) * 100)}%` }} />
                </span>
              </a>
            ))}
          </div>
        </section>
      </div> : null}
    </div>
  );
}

function KnowledgeGraphPanel() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraphMethods<KnowledgeGraphNode, KnowledgeGraphLink>>();
  const [size, setSize] = useState({ width: 900, height: 420 });
  const [hovered, setHovered] = useState<NodeObject<KnowledgeGraphNode> | null>(null);

  const graphData = useMemo<GraphData<KnowledgeGraphNode, KnowledgeGraphLink>>(() => buildKnowledgeGraph(), []);
  const graphWidth = Math.max(320, Math.floor(size.width));
  const graphHeight = Math.max(320, Math.floor(size.height));

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: rect.width || 900,
        height: rect.height || 420,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      graphRef.current?.zoomToFit(450, 34);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [graphData.nodes.length, graphWidth]);

  return (
    <div className="workbench-panel graph-panel">
      <SectionTitle title="知识图谱" subtitle="绿色是主题，灰色是学习记录；连线表示这条记录沉淀到了哪个主题里。" />
      <div className="knowledge-graph-shell" ref={containerRef}>
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={graphWidth}
          height={graphHeight}
          backgroundColor="#070807"
          nodeCanvasObject={drawKnowledgeNode}
          nodePointerAreaPaint={paintKnowledgeNodeHitArea}
          nodeLabel={(node) => `${node.kind === "topic" ? "主题" : "学习记录"}：${node.label}`}
          linkColor={() => "rgba(202, 207, 199, 0.24)"}
          linkWidth={(link) => {
            const target = typeof link.target === "object" ? link.target as NodeObject<KnowledgeGraphNode> : undefined;
            return target?.kind === "topic" ? 1.1 : 0.8;
          }}
          d3VelocityDecay={0.36}
          cooldownTicks={100}
          minZoom={0.5}
          maxZoom={6}
          onNodeHover={(node) => setHovered(node)}
          onNodeClick={(node) => {
            window.location.hash = node.target;
          }}
        />
        <div className="graph-legend" aria-label="图例">
          <span><i className="topic-dot" />主题</span>
          <span><i className="session-dot" />学习记录</span>
          <span>{topics.length} 个主题 / {sessions.length} 条记录</span>
        </div>
        {hovered ? (
          <div className="graph-hover-card">
            <span>{hovered.kind === "topic" ? "主题" : "学习记录"}</span>
            <strong>{hovered.label}</strong>
            <small>
              {hovered.kind === "topic"
                ? `${hovered.count} 条学习记录${hovered.date ? ` / 最新 ${hovered.date}` : ""}`
                : `${hovered.date ?? "暂无日期"} / ${hovered.health === "ok" ? "健康正常" : "需要复核"}`}
            </small>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SessionsPage() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [health, setHealth] = useState("all");
  const [coverage, setCoverage] = useState("all");
  const [sort, setSort] = useState<SessionSort>("latest");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = sessions.filter((session) => {
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
    return [...matches].sort((left, right) => compareSessions(left, right, sort));
  }, [query, topic, health, coverage, sort]);

  return (
    <div className="page-stack">
      <header className="page-header with-search">
        <div>
          <p className="crumb">Vault Viewer / 学习记录</p>
          <h1>学习记录</h1>
          <p>{snapshot.sessionsCount} 条学习记录 / {latestMonth} / 本机知识库</p>
        </div>
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索学习记录..."
            aria-label="搜索学习记录"
          />
        </label>
      </header>

      <div className="filter-bar" aria-label="Session filters">
        <select value={topic} onChange={(event) => setTopic(event.target.value)} aria-label="Topic filter">
          <option value="all">主题</option>
          {allTopicIds.map((topicId) => (
            <option value={topicId} key={topicId}>
              {topicId}
            </option>
          ))}
        </select>
        <select value={health} onChange={(event) => setHealth(event.target.value)} aria-label="Health filter">
          <option value="all">健康</option>
          <option value="ok">OK</option>
          <option value="warning">提醒</option>
          <option value="error">错误</option>
        </select>
        <select value={coverage} onChange={(event) => setCoverage(event.target.value)} aria-label="Artifact filter">
          <option value="all">素材</option>
          <option value="complete">完整</option>
          <option value="incomplete">有缺口</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as SessionSort)} aria-label="Sort sessions">
          <option value="latest">最新优先</option>
          <option value="reread">综合优先级</option>
          <option value="health">健康动作优先</option>
          <option value="artifacts">素材缺口优先</option>
        </select>
        <span className="result-count">显示 {filtered.length} 条</span>
      </div>

      <div className="session-list">
        {filtered.length ? filtered.map((session) => (
          <SessionCard session={session} key={session.id} />
        )) : <EmptyList label="暂无学习记录" detail="本机知识库还没有匹配项。换一个关键词，或清空筛选条件。" />}
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: VaultSession }) {
  const sourceMeta = [session.author, sourceDomain(session.url) || session.sourceType].filter(Boolean).join(" / ");

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
      {sourceMeta ? <p className="source-meta">{sourceMeta}</p> : null}
      <p className="session-summary">{session.content.summary || session.whyItMatters}</p>
      {session.whyItMatters ? <p className="why-line">{session.whyItMatters}</p> : null}
      <div className="pill-row">
        {session.topics.approved.map((topicId) => (
          <TopicPill id={topicId} key={topicId} />
        ))}
      </div>
      <div className="artifact-line">
        <span>{session.notebooklm.artifactCoverage.presentCount}/{session.notebooklm.artifactCoverage.declaredCount} 份素材</span>
        <span>{session.status.publishCandidate ? "可作为发布候选" : stageLabel(session.status.stage)}</span>
        <span>{sessionHealthLabel(session)}</span>
      </div>
    </article>
  );
}

function SessionDetail({ session }: { session: VaultSession }) {
  return (
    <div className="session-detail">
      <article className="reader-column">
        <div className="breadcrumbs">
          <a href={href("/sessions")}>学习记录</a>
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
          <SectionTitle title="阅读" subtitle="synthesis.md" />
          <MarkdownView markdown={session.content.synthesis} />
        </section>

        <section id="notebooklm" className="reader-section">
          <SectionTitle title="NotebookLM 输出" subtitle="report.md / topology.md" />
          <DisclosureBlock id="report" title="学习报告" markdown={session.content.report} />
          <DisclosureBlock id="topology" title="知识拓扑" markdown={session.content.topology} />
        </section>

        <section id="notes" className="reader-section">
          <SectionTitle title="笔记" subtitle="questions / my-notes / debate / process-log" />
          <DisclosureBlock id="questions" title="追问" markdown={session.content.questions} />
          <DisclosureBlock id="my-notes" title="我的笔记" markdown={session.content.myNotes} />
          <DisclosureBlock id="debate" title="辩论记录" markdown={session.content.debate} />
          <DisclosureBlock id="process-log" title="过程日志" markdown={session.content.processLog} />
        </section>

        <section id="practice" className="reader-section">
          <SectionTitle title="练习" subtitle="抽认卡 / 测验 / 思维导图" />
          <PracticePanel session={session} />
        </section>
      </article>
    </div>
  );
}

function DisclosureBlock({ id, title, markdown }: { id: string; title: string; markdown: string }) {
  return (
    <details className="content-disclosure" id={id}>
      <summary>
        <span>{title}</span>
        <small>{firstPlainText(markdown) || "暂无内容"}</small>
      </summary>
      <MarkdownView markdown={markdown} />
    </details>
  );
}

function TopicsPage() {
  const [query, setQuery] = useState("");
  const filteredTopics = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return topics;
    return topics.filter((topic) => {
      const text = `${topic.id} ${topic.title} ${topic.summary} ${topic.markdown}`.toLowerCase();
      return text.includes(needle);
    });
  }, [query]);
  const topicGroups = [
    { label: "核心聚合", detail: "关联 2 条以上学习记录", items: filteredTopics.filter((topic) => topic.count > 1) },
    { label: "单点线索", detail: "关联 1 条学习记录", items: filteredTopics.filter((topic) => topic.count <= 1) },
  ];

  return (
    <div className="page-stack">
      <header className="page-header with-search">
        <div>
          <p className="crumb">Vault Viewer / 主题地图</p>
          <h1>主题地图</h1>
          <p>按每条学习记录里确认过的主题自动汇总，用来承接跨记录综合。</p>
        </div>
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search topics..."
            aria-label="Search topics"
          />
        </label>
      </header>
      <div className="topic-map-strip">
        <Metric label="当前显示" value={`${filteredTopics.length}/${topics.length}`} />
        <Metric label="核心主题" value={`${topics.filter((topic) => topic.count > 1).length}`} />
        <Metric label="最新月份" value={latestMonth || "none"} />
      </div>
      {filteredTopics.length ? topicGroups.map((group) => (
        group.items.length ? (
          <section className="topic-group-section" key={group.label}>
            <SectionTitle title={group.label} subtitle={group.detail} />
            <div className="topic-grid">
              {group.items.map((topic) => (
                <TopicCard topic={topic} key={topic.id} />
              ))}
            </div>
          </section>
        ) : null
      )) : <EmptyList label="暂无匹配 topics" detail="换一个关键词，或回到全部 topic map。" />}
    </div>
  );
}

function TopicCard({ topic }: { topic: VaultTopic }) {
  return (
    <a className="topic-card" href={href(`/topics/${topic.id}`)}>
      <span className="topic-count">{topic.count}</span>
      <h2>{topic.id}</h2>
      <p>{topic.summary || "暂无主题摘要。"}</p>
      <small>{topic.latestDate || "暂无学习记录"} / {topic.count} 条学习记录</small>
    </a>
  );
}

function TopicDetail({ topic }: { topic: VaultTopic }) {
  const currentUnderstanding = markdownSection(topic.markdown, "当前理解");
  const pending = markdownSection(topic.markdown, "待合并 / 待拆分");

  return (
    <div className="page-stack detail-narrow">
      <div className="breadcrumbs">
        <a href={href("/topics")}>主题地图</a>
        <ChevronRight size={14} />
        <span>{topic.id}</span>
      </div>
      <header className="page-header">
        <h1>{topic.id}</h1>
        <p>{topic.count} 条学习记录 / 最新 {topic.latestDate || "暂无"}</p>
      </header>
      <section className="topic-understanding">
        <SectionTitle title="当前理解" subtitle={topic.path} />
        <MarkdownView markdown={currentUnderstanding || topic.markdown} />
      </section>
      <section>
        <SectionTitle title="关联学习记录" subtitle="由每条学习记录的主题标注汇总" />
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
      {pending ? (
        <section className="topic-understanding pending">
          <SectionTitle title="待合并 / 待拆分" />
          <MarkdownView markdown={pending} />
        </section>
      ) : null}
    </div>
  );
}

function HealthPage() {
  const groups = groupFindings(healthData.findings);
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="crumb">Vault Viewer / 健康检查</p>
        <h1>Vault 健康检查</h1>
        <p>影响后续复盘的一致性检查，不以空泛健康分替代具体 finding。</p>
      </header>
      <section className="metric-strip">
        <Metric label="总体状态" value={healthData.summary.status === "ok" ? "正常" : "需复核"} tone={healthData.summary.status === "ok" ? "good" : "warn"} />
        <Metric label="健康项" value={String(healthData.summary.totalFindings)} />
        <Metric label="错误" value={String(healthData.summary.countsBySeverity.error ?? 0)} tone="danger" />
        <Metric label="提醒" value={String(healthData.summary.countsBySeverity.warning ?? 0)} tone="warn" />
      </section>
      <div className="health-groups">
        {Object.entries(groups).map(([type, findings]) => (
          <section className="health-group" key={type}>
            <h2>{healthGroupLabel(type)}</h2>
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
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  return (
    <div className="practice-stack">
      {flashcards ? (
        <section className="practice-block" id="flashcards">
          <h3>{flashcards.title}</h3>
          <div className="flashcard-grid">
            {flashcards.cards.slice(0, 12).map((card, index) => (
              <button
                className="flashcard"
                key={`${card.front}-${index}`}
                type="button"
                aria-pressed={Boolean(flippedCards[index])}
                onClick={() => setFlippedCards((current) => ({ ...current, [index]: !current[index] }))}
              >
                <span>{flippedCards[index] ? "Back" : "Front"}</span>
                <strong>{flippedCards[index] ? card.back : card.front}</strong>
                <small>{flippedCards[index] ? "Click to return" : "Click to reveal"}</small>
              </button>
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
                  {question.answerOptions.map((option, answerIndex) => {
                    const selected = selectedAnswers[index] === answerIndex;
                    const revealed = selectedAnswers[index] !== undefined;
                    return (
                    <button
                      className={`${option.isCorrect && revealed ? "answer correct" : "answer"} ${selected ? "selected" : ""}`}
                      key={option.text}
                      type="button"
                      onClick={() => setSelectedAnswers((current) => ({ ...current, [index]: answerIndex }))}
                    >
                      <span>{revealed && option.isCorrect ? "Correct" : selected ? "Selected" : "Option"}</span>
                      <p>{option.text}</p>
                      {revealed && option.rationale ? <small>{option.rationale}</small> : null}
                    </button>
                    );
                  })}
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
        <h2>本机知识库目前为空</h2>
      </div>
      <p>
        这是公开模板仓的默认状态。工具、文档、脚本和展示页可以开源；真实学习内容只保存在本机私有知识库里。
      </p>
      <ol>
        <li>用 NotebookLM Pipeline 生成一条学习记录。</li>
        <li>把来源、摘要、笔记和练习素材保存到本机知识库。</li>
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

function FindingCard({ finding }: { finding: HealthFinding }) {
  return (
    <article className={`finding-card ${finding.severity}`}>
      <div>
        <HealthSeverityIcon severity={finding.severity} />
        <strong>{healthActionLabel(finding)}</strong>
      </div>
      <p>{healthFindingDetail(finding)}</p>
      <p>
        {finding.sessionId ? `学习记录：${finding.sessionId}` : ""}
        {finding.topicId ? `主题：${finding.topicId}` : ""}
      </p>
      {finding.path ? <small>{finding.path}</small> : null}
      <a className="text-link" href={findingHref(finding)}>查看相关内容</a>
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

function buildKnowledgeGraph(): GraphData<KnowledgeGraphNode, KnowledgeGraphLink> {
  const topicNodes: KnowledgeGraphNode[] = topics.map((topic) => ({
    id: `topic:${topic.id}`,
    entityId: topic.id,
    label: topic.id,
    kind: "topic",
    count: topic.count,
    date: topic.latestDate,
    target: href(`/topics/${topic.id}`),
  }));
  const topicIdSet = new Set(topics.map((topic) => topic.id));
  const sessionNodes: KnowledgeGraphNode[] = sessions.map((session) => ({
    id: `session:${session.id}`,
    entityId: session.id,
    label: session.title,
    kind: "session",
    count: session.topics.approved.length,
    date: session.capturedAt,
    health: session.health.status,
    target: href(`/sessions/${session.id}`),
  }));
  const links: KnowledgeGraphLink[] = sessions.flatMap((session) =>
    session.topics.approved
      .filter((topicId) => topicIdSet.has(topicId))
      .map((topicId) => ({
        source: `session:${session.id}`,
        target: `topic:${topicId}`,
      })),
  );

  return { nodes: [...topicNodes, ...sessionNodes], links };
}

function drawKnowledgeNode(node: NodeObject<KnowledgeGraphNode>, context: CanvasRenderingContext2D, globalScale: number) {
  const radius = knowledgeNodeRadius(node);
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const isTopic = node.kind === "topic";

  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = isTopic ? "#38d276" : node.health === "warning" ? "#d6b46a" : "#d9d9d3";
  context.fill();

  context.lineWidth = isTopic ? 1.6 : 0.9;
  context.strokeStyle = isTopic ? "rgba(105, 245, 158, 0.78)" : "rgba(255, 255, 255, 0.44)";
  context.stroke();

  if ((isTopic && (node.count > 1 || globalScale > 1.45)) || globalScale > 2.1) {
    const label = isTopic ? truncateLabel(node.label, 26) : truncateLabel(node.label, 30);
    context.font = `${Math.max(10, 12 / globalScale)}px Inter, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillStyle = isTopic ? "rgba(218, 255, 232, 0.92)" : "rgba(236, 236, 230, 0.72)";
    context.fillText(label, x, y + radius + 4);
  }
}

function paintKnowledgeNodeHitArea(node: NodeObject<KnowledgeGraphNode>, color: string, context: CanvasRenderingContext2D) {
  const radius = knowledgeNodeRadius(node) + 5;
  context.fillStyle = color;
  context.beginPath();
  context.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2);
  context.fill();
}

function knowledgeNodeRadius(node: NodeObject<KnowledgeGraphNode>) {
  return node.kind === "topic" ? 7 + Math.min(node.count, 6) * 2 : 4.5 + Math.min(node.count, 4);
}

function truncateLabel(label: string, maxLength: number) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

function groupFindings(findings: HealthFinding[]) {
  return findings.reduce<Record<string, HealthFinding[]>>((groups, finding) => {
    if (!groups[finding.type]) groups[finding.type] = [];
    groups[finding.type].push(finding);
    return groups;
  }, {});
}

function compareSessions(left: VaultSession, right: VaultSession, sort: SessionSort) {
  if (sort === "reread") return right.rereadScore - left.rereadScore || latestFirst(left, right);
  if (sort === "health") return healthOrder[left.health.status] - healthOrder[right.health.status] || latestFirst(left, right);
  if (sort === "artifacts") {
    const leftGap = left.notebooklm.artifactCoverage.declaredCount - left.notebooklm.artifactCoverage.presentCount;
    const rightGap = right.notebooklm.artifactCoverage.declaredCount - right.notebooklm.artifactCoverage.presentCount;
    return rightGap - leftGap || latestFirst(left, right);
  }
  return latestFirst(left, right);
}

function latestFirst(left: VaultSession, right: VaultSession) {
  return right.capturedAt.localeCompare(left.capturedAt) || left.title.localeCompare(right.title);
}

function sourceDomain(url: string) {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

function sessionHealthLabel(session: VaultSession) {
  if (session.health.status === "ok") return "健康正常";
  return `${session.health.warnings + session.health.errors} 个健康动作`;
}

function stageLabel(stage: string) {
  if (stage === "complete") return "已完成";
  if (stage === "draft") return "草稿";
  if (stage === "review") return "待复核";
  return stage || "未标记";
}

function firstPlainText(markdown: string) {
  return markdown
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/^#+\s+/gm, "")
    .replace(/[`*_>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function markdownSection(markdown: string, heading: string) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";
  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line.trim()));
  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n").trim();
}

function healthActionLabel(finding: HealthFinding) {
  if (finding.type === "missing_primary_source_id_inferred") return "补一条来源编号，去掉自动推断";
  if (finding.type === "multiple_source_ids") return "确认这条记录的 NotebookLM 来源";
  if (finding.type === "missing_session_reference") return "补上主题里的学习记录引用";
  if (finding.type === "artifact_missing_path") return "补齐缺失练习素材";
  if (finding.type === "broken_local_link") return "修复本地 Markdown 链接";
  return finding.type.replace(/_/g, " ");
}

function healthGroupLabel(type: string) {
  if (type === "missing_primary_source_id_inferred") return "来源编号可补全";
  if (type === "multiple_source_ids") return "来源需要确认";
  if (type === "missing_session_reference") return "主题关联缺失";
  if (type === "artifact_missing_path") return "素材路径缺失";
  if (type === "broken_local_link") return "本地链接失效";
  return type.replace(/_/g, " ");
}

function healthFindingDetail(finding: HealthFinding) {
  if (finding.type === "missing_primary_source_id_inferred") {
    return "这条记录只有一个来源，系统可以自动判断，但最好把来源编号补上，后续复用时更稳。";
  }
  if (finding.type === "multiple_source_ids") {
    return "这条记录关联了多个 NotebookLM 来源，复用前需要确认是否有同一次处理留下的残留来源。";
  }
  return finding.message;
}

function findingHref(finding: HealthFinding) {
  if (finding.sessionId) return href(`/sessions/${finding.sessionId}`);
  if (finding.topicId) return href(`/topics/${finding.topicId}`);
  return href("/health");
}

function HealthSeverityIcon({ severity }: { severity: HealthSeverity }) {
  if (severity === "error") return <AlertTriangle className="status-icon error" size={19} aria-label="error" />;
  if (severity === "warning") return <AlertTriangle className="status-icon warning" size={19} aria-label="warning" />;
  return <CircleHelp className="status-icon info" size={19} aria-label="info" />;
}

export default App;
