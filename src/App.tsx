import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  FolderOpen,
  GitBranch,
  HeartPulse,
  Home,
  Info,
  Menu,
  Search,
  Sparkles,
  Tag,
  X,
  type LucideIcon,
} from "lucide-react";
import { marked } from "marked";
import ForceGraph2D, { type ForceGraphMethods, type GraphData, type LinkObject, type NodeObject } from "react-force-graph-2d";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
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
  FlashcardsArtifact,
  HealthFinding,
  HealthSeverity,
  MindmapNode,
  QuizArtifact,
  Route,
  VaultSession,
  VaultTopic,
} from "./types";

const PRODUCT_NAME = "NotebookLM星图";
const brandLogoUrl = new URL("./assets/vault-viewer-logo.png", import.meta.url).href;

const navItems = [
  { href: "/", label: "概览", icon: Home, match: ["overview"] },
  { href: "/sessions", label: "学习记录", icon: CalendarDays, match: ["sessions", "session"] },
  { href: "/topics", label: "主题地图", icon: GitBranch, match: ["topics", "topic"] },
  { href: "/health", label: "健康检查", icon: HeartPulse, match: ["health"] },
];

type SessionSort = "latest" | "earliest";
type SessionTocItem = {
  id: string;
  label: string;
  children?: SessionTocItem[];
};
type SessionTocGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: SessionTocItem[];
};
type KnowledgeNodeKind = "topic" | "session";
type KnowledgeGraphNode = {
  id: string;
  entityId: string;
  label: string;
  kind: KnowledgeNodeKind;
  count: number;
  date?: string;
  target: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  anchorX?: number;
  anchorY?: number;
};
type KnowledgeGraphLink = {
  source: string;
  target: string;
};
type KnowledgeGraphHoverState = {
  nodeIds: Set<string>;
  related: NodeObject<KnowledgeGraphNode>[];
};
type SessionRelatedItem = {
  session: VaultSession;
  overlap: number;
  sharedTopics: string[];
};
type TopicRelatedSignal = {
  id: string;
  count: number;
};
type CollapsibleHeadingLevel = 2 | 3 | 4 | 5 | 6;
type MindmapLayoutNode = {
  childCount: number;
  depth: number;
  height: number;
  id: string;
  name: string;
  width: number;
  x: number;
  y: number;
};
type MindmapLayoutLink = {
  source: MindmapLayoutNode;
  target: MindmapLayoutNode;
};
type MindmapLayout = {
  height: number;
  links: MindmapLayoutLink[];
  nodes: MindmapLayoutNode[];
  width: number;
};

const EMPTY_COLLAPSED_IDS = new Set<string>();
const GRAPH_DETAIL_RELATED_LIMIT = 5;
const MINDMAP_FIT_MARGIN = 8;
const MINDMAP_MIN_SCALE = 0.5;
const MARKDOWN_HEADING_TRANSLATIONS = new Map<string, string>([
  ["agent inference", "Agent 推断"],
  ["approved", "已确认"],
  ["core report", "核心报告"],
  ["entropic loop", "熵增循环"],
  ["knowledge topology", "知识拓扑"],
  ["negentropic loop", "负熵循环"],
  ["notebooklm report", "NotebookLM 学习报告"],
  ["notebooklm synthesis", "NotebookLM 归纳"],
  ["notebooklm-with-agent-edit", "NotebookLM 与 Agent 整理"],
  ["proposed", "建议归类"],
  ["source facts", "来源事实"],
]);

function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useLayoutEffect(() => {
    if (route.name === "session" && route.section) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [route]);

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
    return session ? <SessionDetail section={route.section} session={session} /> : <NotFound label="session" value={route.id} />;
  }
  if (route.name === "topic") {
    const topic = topicById.get(route.id);
    return topic ? <TopicDetail topic={topic} /> : <NotFound label="topic" value={route.id} />;
  }
  return <NotFound label="route" value={route.path} />;
}

function Breadcrumb({ current }: { current: string }) {
  return <p className="crumb">{PRODUCT_NAME} / {current}</p>;
}

function Sidebar({ route, currentRoute }: { route: string; currentRoute: Route }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentSession = currentRoute.name === "session" ? sessionById.get(currentRoute.id) : undefined;
  const currentTopic = currentRoute.name === "topic" ? topicById.get(currentRoute.id) : undefined;
  const contextPanel = currentSession ? <SessionContextPanel session={currentSession} /> : currentTopic ? <TopicSidebarPanel topic={currentTopic} /> : null;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [currentRoute]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  return (
    <aside className={mobileNavOpen ? "sidebar mobile-nav-open" : "sidebar"} aria-label="Vault navigation">
      <div className="sidebar-topbar">
        <a className="brand" href={href("/")} onClick={() => setMobileNavOpen(false)}>
          <span className="brand-mark">
            <img src={brandLogoUrl} alt="" aria-hidden="true" />
          </span>
          <span>
            <strong>{PRODUCT_NAME}</strong>
            <em>把学习沉淀接成星系</em>
          </span>
        </a>
        <button
          aria-controls="mobile-sidebar-drawer"
          aria-expanded={mobileNavOpen}
          aria-label={mobileNavOpen ? "关闭导航菜单" : "打开导航菜单"}
          className="mobile-menu-button"
          onClick={() => setMobileNavOpen((open) => !open)}
          type="button"
        >
          {mobileNavOpen ? <X size={21} strokeWidth={2} /> : <Menu size={21} strokeWidth={2} />}
        </button>
      </div>
      <div className="sidebar-drawer" id="mobile-sidebar-drawer">
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.match.includes(route);
            return (
              <a className={active ? "nav-link active" : "nav-link"} href={href(item.href)} key={item.href} onClick={() => setMobileNavOpen(false)}>
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
        {contextPanel}
      </div>
      {mobileNavOpen ? <button aria-label="关闭导航菜单背景遮罩" className="mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} type="button" /> : null}
    </aside>
  );
}

function SessionContextPanel({ session }: { session: VaultSession }) {
  const relatedSessions = useMemo(() => strongestRelatedSessions(session), [session]);

  return (
    <section className="session-context" aria-label="本 session 关联">
      <p>本 session 关联</p>
      <div className="context-group">
        <h2>Topics</h2>
        <div className="context-topic-list">
          {session.topics.approved.map((topicId) => (
            <a href={href(`/topics/${topicId}`)} key={topicId}>
              <span>{topicTitle(topicId)}</span>
              <small>{topicId}</small>
            </a>
          ))}
        </div>
      </div>
      {relatedSessions.length ? (
        <div className="context-group">
          <h2>相关文章</h2>
          <div className="context-session-list">
            {relatedSessions.map((item) => (
              <a href={href(`/sessions/${item.session.id}`)} key={item.session.id}>
                <span>{item.session.title}</span>
                <small>{item.overlap} 个共同 topic / {item.sharedTopics.map(topicTitle).join("、")}</small>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TopicSidebarPanel({ topic }: { topic: VaultTopic }) {
  const related = useMemo(() => relatedTopicsForTopic(topic).slice(0, 8), [topic]);

  if (!related.length) return null;

  return (
    <section className="session-context topic-sidebar-context" aria-label="本 topic 关联主题">
      <p>本 topic 关联</p>
      <div className="context-group">
        <h2>关联主题</h2>
        <div className="context-topic-list">
          {related.map((item) => (
            <a href={href(`/topics/${item.id}`)} key={item.id}>
              <span>{topicTitle(item.id)}</span>
              <small>{item.count} 条共同记录</small>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function SessionToc({
  groups,
  onNavigate,
  session,
}: {
  groups: SessionTocGroup[];
  onNavigate: (id: string) => void;
  session: VaultSession;
}) {
  return (
    <nav className="session-toc" aria-label="本页目录">
      <p>本页目录</p>
      {groups.map((group) => {
        const Icon = group.icon;
        return (
          <div className="toc-group" key={group.id}>
            <a href={sessionSectionHref(session.id, group.id)} onClick={(event) => handleTocClick(event, group.id, onNavigate)}>
              <Icon size={17} />
              <span>{group.label}</span>
            </a>
            {group.items.length ? (
              <div className="toc-items">
                {group.items.map((item) => (
                  <TocItemLink item={item} key={item.id} onNavigate={onNavigate} sessionId={session.id} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function TocItemLink({
  depth = 0,
  item,
  onNavigate,
  sessionId,
}: {
  depth?: number;
  item: SessionTocItem;
  onNavigate: (id: string) => void;
  sessionId: string;
}) {
  return (
    <div className={`toc-item depth-${depth}`}>
      <a href={sessionSectionHref(sessionId, item.id)} onClick={(event) => handleTocClick(event, item.id, onNavigate)}>
        {item.label}
      </a>
      {item.children?.length ? (
        <div className="toc-children">
          {item.children.map((child) => (
            <TocItemLink depth={depth + 1} item={child} key={child.id} onNavigate={onNavigate} sessionId={sessionId} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function handleTocClick(event: MouseEvent<HTMLAnchorElement>, id: string, onNavigate: (id: string) => void) {
  event.preventDefault();
  onNavigate(id);
}

function Overview() {
  const [query, setQuery] = useState("");
  const topTopics = useMemo(() => [...topics].sort(compareTopicsBySignal).slice(0, 7), []);
  const isEmpty = sessions.length === 0;
  const filteredSessions = useMemo(
    () => sessions.filter((session) => matchesOverviewSession(session, query)).slice(0, 8),
    [query],
  );
  const filteredTopics = useMemo(
    () => topics.filter((topic) => matchesOverviewTopic(topic, query)).sort(compareTopicsBySignal).slice(0, 8),
    [query],
  );
  const latestSession = sessions[0];

  return (
    <div className="page-stack">
      <header className="page-header overview-header">
        <div className="overview-copy">
          <Breadcrumb current="概览" />
          <h1>个人知识库概览</h1>
          <p className="page-intent">
            NotebookLM 负责消化材料，本机知识库保存可追溯记录，最终沉淀成可复用知识卡片。
          </p>
        </div>
      </header>

      <section className="action-metric-grid" aria-label="Vault actions">
        <ActionMetric
          detail={latestSession ? latestSession.title : "尚无学习记录"}
          href={latestSession ? href(`/sessions/${latestSession.id}`) : href("/sessions")}
          icon={CalendarDays}
          label="最新流入"
          value={latestSession?.capturedAt ?? "none"}
        />
        <ActionMetric
          detail={`${snapshot.topicsCount} 个主题，${snapshot.sessionsCount} 条记录`}
          href={href("/topics")}
          icon={GitBranch}
          label="可复用主题"
          tone="good"
          value={topTopics[0]?.title ?? "none"}
        />
        <ActionMetric
          detail={`${snapshot.sessionsCount} 条记录，覆盖 ${snapshot.monthRange.join(" - ") || "暂无月份"}`}
          href={href("/sessions")}
          icon={BookOpen}
          label="学习沉淀"
          value={`${snapshot.sessionsCount} 条`}
        />
      </section>

      <OverviewControls query={query} onQueryChange={setQuery} />

      {isEmpty ? (
        <EmptyVaultState />
      ) : (
        <section className="workbench-board" id="overview-workbench">
          <KnowledgeGraphPanel query={query} />
        </section>
      )}

      {!isEmpty ? <div className="dashboard-grid overview-preview-grid">
        <section>
          <SectionTitle title="主题入口" subtitle="按记录数与更新时间组织入口。" />
          <TopicEntryGrid topics={filteredTopics.slice(0, 7)} />
        </section>

        <section>
          <SectionTitle title="学习流入" subtitle="最近沉淀到本机知识库的学习记录" />
          <LearningSessionCards sessions={filteredSessions.slice(0, 4)} />
        </section>
      </div> : null}
    </div>
  );
}

function OverviewControls({ onQueryChange, query }: { onQueryChange: (query: string) => void; query: string }) {
  return (
    <div className="overview-controls" aria-label="概览搜索">
      <label className="search-box overview-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索主题、记录、来源..."
          aria-label="搜索概览"
        />
      </label>
    </div>
  );
}

function ActionMetric({
  detail,
  href: targetHref,
  icon: Icon,
  label,
  tone,
  value,
}: {
  detail: string;
  href: string;
  icon: LucideIcon;
  label: string;
  tone?: "good" | "warn" | "danger";
  value: string;
}) {
  return (
    <a className={["action-metric", tone ?? ""].filter(Boolean).join(" ")} href={targetHref}>
      <span className="action-metric-icon">
        <Icon size={22} strokeWidth={1.85} />
      </span>
      <span className="action-metric-copy">
        <span className="action-metric-heading">
          <em>{label}</em>
          <strong>{value}</strong>
        </span>
        <small>{detail}</small>
      </span>
      <ChevronRight size={17} strokeWidth={1.8} />
    </a>
  );
}

function TopicEntryGrid({ topics: items }: { topics: VaultTopic[] }) {
  if (!items.length) return <EmptyList label="暂无匹配主题" detail="换一个关键词，或清空搜索。" />;
  const maxCount = Math.max(1, ...items.map((topic) => topic.count));

  return (
    <div className="topic-entry-grid">
      {items.map((topic, index) => (
        <a className="topic-entry-card" href={href(`/topics/${topic.id}`)} key={topic.id}>
          <span className="topic-entry-rank">{String(index + 1).padStart(2, "0")}</span>
          <span className="topic-entry-title">
            <Tag size={15} />
            <strong>{topic.title}</strong>
          </span>
          <span className="topic-entry-footer">
            <span className="topic-entry-meter">
              <i style={{ width: `${Math.max(14, (topic.count / maxCount) * 100)}%` }} />
            </span>
            <small>{topic.count} 条</small>
            <small>最新 {formatMonthDay(topic.latestDate)}</small>
          </span>
        </a>
      ))}
    </div>
  );
}

function LearningSessionCards({ sessions: items }: { sessions: VaultSession[] }) {
  if (!items.length) return <EmptyList label="暂无匹配学习记录" detail="换一个关键词，或清空搜索。" />;

  return (
    <div className="session-card-stack">
      {items.map((session) => (
        <a className="session-preview-card" href={href(`/sessions/${session.id}`)} key={session.id}>
          <span className="session-preview-meta">
            <small>{formatMonthDay(session.capturedAt)}</small>
            <small>{sourcePlatformLabel(session.url, session.sourceType)}</small>
          </span>
          <strong>{session.title}</strong>
          <p>{session.content.summary || session.whyItMatters}</p>
          <span className="record-chip-line">
            {session.topics.approved.slice(0, 2).map((topicId) => (
              <em key={topicId}>{topicTitle(topicId)}</em>
            ))}
            {session.topics.approved.length > 2 ? <em>+{session.topics.approved.length - 2}</em> : null}
          </span>
        </a>
      ))}
    </div>
  );
}

function KnowledgeGraphPanel({ query }: { query: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraphMethods<KnowledgeGraphNode, KnowledgeGraphLink>>();
  const [size, setSize] = useState({ width: 900, height: 420 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const graphData = useMemo<GraphData<KnowledgeGraphNode, KnowledgeGraphLink>>(() => buildKnowledgeGraph(), []);
  const graphWidth = Math.max(320, Math.floor(size.width));
  const graphHeight = Math.max(320, Math.floor(size.height));
  const laidOutGraphData = useMemo(
    () => layoutKnowledgeGraph(graphData, graphWidth, graphHeight),
    [graphData, graphHeight, graphWidth],
  );
  const visibleGraphData = useMemo(
    () => filterKnowledgeGraph(laidOutGraphData, query),
    [laidOutGraphData, query],
  );
  const nodeById = useMemo(
    () => new Map(laidOutGraphData.nodes.map((node) => [String(node.id), node])),
    [laidOutGraphData],
  );
  const visibleNodeById = useMemo(
    () => new Map(visibleGraphData.nodes.map((node) => [String(node.id), node])),
    [visibleGraphData],
  );
  const hoveredNode = hoveredId ? nodeById.get(hoveredId) ?? null : null;
  const selectedNode = selectedId ? nodeById.get(selectedId) ?? null : null;
  const visibleHoveredNode = hoveredId ? visibleNodeById.get(hoveredId) ?? null : null;
  const visibleSelectedNode = selectedId ? visibleNodeById.get(selectedId) ?? null : null;
  const graphFocusNode = visibleHoveredNode ?? visibleSelectedNode;
  const graphFocusState = useMemo(
    () => buildKnowledgeGraphHoverState(visibleGraphData, graphFocusNode),
    [graphFocusNode?.id, visibleGraphData],
  );
  const selectedState = useMemo(
    () => buildKnowledgeGraphHoverState(laidOutGraphData, selectedNode),
    [laidOutGraphData, selectedNode?.id],
  );

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
    const graph = graphRef.current;
    if (!graph) return;

    configureKnowledgeGraphForces(graph, graphWidth, graphHeight);
    const fitGraph = () => {
      graph.zoomToFit(560, 30);
    };
    const timers = [650, 2200, 4200].map((delay) => window.setTimeout(fitGraph, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [graphHeight, graphWidth, visibleGraphData.nodes.length]);

  return (
    <section className="graph-section">
      <SectionTitle title="知识图谱" subtitle="绿色是主题，灰色是学习记录；连线表示这条记录沉淀到了哪个主题里。" />
      <div className="workbench-panel graph-panel">
        <div className="graph-workbench">
          <div className="knowledge-graph-shell" ref={containerRef}>
            <ForceGraph2D
              ref={graphRef}
              graphData={visibleGraphData}
              width={graphWidth}
              height={graphHeight}
              backgroundColor="#f7f8f4"
              nodeCanvasObject={(node, context, globalScale) => drawKnowledgeNode(node, context, globalScale, graphFocusState, hoveredId)}
              nodePointerAreaPaint={paintKnowledgeNodeHitArea}
              nodeLabel={() => ""}
              linkColor={(link) => graphLinkColor(link, graphFocusState)}
              linkWidth={(link) => graphLinkWidth(link, graphFocusState)}
              linkHoverPrecision={8}
              d3VelocityDecay={0.28}
              warmupTicks={50}
              cooldownTicks={220}
              minZoom={0.5}
              maxZoom={6}
              onEngineStop={() => graphRef.current?.zoomToFit(560, 30)}
              onNodeHover={(node) => setHoveredId(node?.id ? String(node.id) : null)}
              onNodeClick={(node) => {
                setSelectedId(node.id ? String(node.id) : null);
              }}
            />
            <div className="graph-legend" aria-label="图例">
              <span><i className="topic-dot" />主题</span>
              <span><i className="session-dot" />学习记录</span>
              <span>{topics.length} 个主题 / {sessions.length} 条记录</span>
            </div>
          </div>
          {selectedNode ? (
            <GraphDetailCard
              className="graph-inspector-card"
              node={selectedNode}
              related={selectedState.related}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <GraphEmptyInspector />
          )}
        </div>
      </div>
    </section>
  );
}

function GraphDetailCard({
  className,
  node,
  onClose,
  related,
}: {
  className?: string;
  node: NodeObject<KnowledgeGraphNode>;
  onClose: () => void;
  related: NodeObject<KnowledgeGraphNode>[];
}) {
  const rawRelatedSessions = related.filter((item) => item.kind === "session");
  const rawRelatedTopics = related.filter((item) => item.kind === "topic");
  const relatedSessions = sortGraphDetailNodes(rawRelatedSessions, node.kind === "topic" ? "topic-session-relevance" : "default");
  const relatedTopics = sortGraphDetailNodes(rawRelatedTopics, "default");

  return (
    <div className={["graph-detail-card", className ?? ""].filter(Boolean).join(" ")}>
      <div className="graph-detail-head">
        <span className="graph-detail-kind">{node.kind === "topic" ? "主题" : "学习记录"}</span>
        <button className="graph-close-button" type="button" onClick={onClose} aria-label="关闭图谱详情">
          <X size={13} strokeWidth={2.1} />
        </button>
        <a className="graph-detail-name" href={node.target}>{node.label}</a>
        <p>
          {node.kind === "topic"
            ? `${node.count} 条学习记录${node.date ? ` / 最新 ${formatMonthDay(node.date)}` : ""}`
            : formatMonthDay(node.date)}
        </p>
      </div>
      <GraphDetailList title="关联学习记录" items={relatedSessions} totalCount={rawRelatedSessions.length} moreHref={node.target} />
      <GraphDetailList title="关联主题" items={relatedTopics} totalCount={rawRelatedTopics.length} moreHref={node.target} />
    </div>
  );
}

function GraphEmptyInspector() {
  return (
    <aside className="graph-empty-inspector" aria-label="图谱详情">
      <span><Info size={17} /></span>
      <strong>选择一个节点</strong>
      <p>点击图谱节点查看关联记录、主题、日期与可追溯入口。</p>
    </aside>
  );
}

function GraphDetailList({
  items,
  moreHref,
  title,
  totalCount,
}: {
  items: NodeObject<KnowledgeGraphNode>[];
  moreHref: string;
  title: string;
  totalCount: number;
}) {
  if (!items.length) return null;
  const visibleItems = items.slice(0, GRAPH_DETAIL_RELATED_LIMIT);
  const hiddenCount = Math.max(0, totalCount - visibleItems.length);

  return (
    <div className="graph-detail-list">
      <div className="graph-detail-list-title">
        <em>{title}</em>
        <small>{totalCount} 条</small>
      </div>
      <div className="graph-detail-items">
        {visibleItems.map((item) => (
          <a className="graph-detail-item" href={item.target} key={item.id}>
            <span>{item.label}</span>
            <small>{graphDetailItemMeta(item)}</small>
          </a>
        ))}
      </div>
      {hiddenCount ? <a className="graph-detail-more" href={moreHref}>还有 {hiddenCount} 条未显示，查看全部</a> : null}
    </div>
  );
}

function graphDetailItemMeta(item: NodeObject<KnowledgeGraphNode>) {
  if (item.kind === "topic") return `${item.count} 条记录${item.date ? ` / ${formatMonthDay(item.date)}` : ""}`;
  return formatMonthDay(item.date);
}

function sortGraphDetailNodes(
  nodes: NodeObject<KnowledgeGraphNode>[],
  mode: "default" | "topic-session-relevance",
) {
  return [...nodes].sort((left, right) => {
    if (mode === "topic-session-relevance") {
      const focusDelta = (left.count ?? 0) - (right.count ?? 0);
      if (focusDelta !== 0) return focusDelta;
      const dateDelta = (right.date ?? "").localeCompare(left.date ?? "");
      if (dateDelta !== 0) return dateDelta;
    }

    const dateDelta = (right.date ?? "").localeCompare(left.date ?? "");
    if (dateDelta !== 0) return dateDelta;
    const countDelta = (right.count ?? 0) - (left.count ?? 0);
    if (countDelta !== 0) return countDelta;
    return left.label.localeCompare(right.label, "zh-Hans-CN");
  });
}

function SessionsPage() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [sort, setSort] = useState<SessionSort>("latest");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = sessions.filter((session) => {
      const text = `${session.title} ${session.originalTitle} ${session.author} ${session.content.summary} ${session.topics.approved.join(" ")} ${session.topics.approved.map(topicTitle).join(" ")}`.toLowerCase();
      const matchesQuery = !needle || text.includes(needle);
      const matchesTopic = topic === "all" || session.topics.approved.includes(topic);
      return matchesQuery && matchesTopic;
    });
    return [...matches].sort((left, right) => compareSessions(left, right, sort));
  }, [query, topic, sort]);
  const grouped = useMemo(() => groupSessionsByDate(filtered), [filtered]);

  return (
    <div className="page-stack sessions-page">
      <header className="page-header sessions-header">
        <div className="overview-copy">
          <Breadcrumb current="学习记录" />
          <h1>学习记录</h1>
          <p className="page-intent">{snapshot.sessionsCount} 条学习记录 / {latestMonth} / 本机知识库</p>
        </div>
      </header>

      <div className="overview-controls session-search-row" aria-label="学习记录搜索">
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索学习记录..."
            aria-label="搜索学习记录"
          />
        </label>
      </div>

      <div className="filter-bar" aria-label="Session filters">
        <label className="filter-control">
          <span>主题</span>
          <select value={topic} onChange={(event) => setTopic(event.target.value)} aria-label="Topic filter">
            <option value="all">全部主题</option>
            {allTopicIds.map((topicId) => (
              <option value={topicId} key={topicId}>
                {topicTitle(topicId)}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-control">
          <span>排序</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SessionSort)} aria-label="Sort sessions">
            <option value="latest">最新优先</option>
            <option value="earliest">最早优先</option>
          </select>
        </label>
        <span className="result-count">显示 {filtered.length} 条</span>
      </div>

      <div className="session-list">
        {grouped.length ? grouped.map((group) => (
          <section className="session-day-group" key={group.date}>
            <div className="session-day-marker">
              <strong>{formatMonthDay(group.date)}</strong>
              <small>{group.date.slice(0, 4)}</small>
            </div>
            <div className="session-day-cards">
              {group.sessions.map((session) => (
                <SessionCard session={session} key={session.id} />
              ))}
            </div>
          </section>
        )) : <EmptyList label="暂无学习记录" detail="本机知识库还没有匹配项。换一个关键词，或清空筛选条件。" />}
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: VaultSession }) {
  const sourceMeta = sessionSourceMeta(session);

  return (
    <article className="session-card">
      <div className="session-card-body">
        <a href={href(`/sessions/${session.id}`)} className="session-card-link">
          <div className="card-main-link">
            <h2>{session.title}</h2>
            <p className="session-source-meta" title={sourceMeta.full}>
              <FolderOpen size={15} />
              <span>{sourceMeta.display}</span>
            </p>
          </div>
          <p className="session-summary">{session.content.summary || session.whyItMatters}</p>
          {session.whyItMatters ? <p className="why-line">{session.whyItMatters}</p> : null}
        </a>
        <div className="pill-row compact-pill-row">
          {session.topics.approved.map((topicId) => (
            <TopicPill id={topicId} key={topicId} />
          ))}
        </div>
      </div>
    </article>
  );
}

function SessionDetail({ section, session }: { section?: string; session: VaultSession }) {
  const sourceLabel = sourcePlatformLabel(session.url, session.sourceType) || "来源";
  const tocGroups = useMemo(() => buildSessionTocGroups(session), [session]);
  const hasPractice = Boolean(session.practice.flashcards || session.practice.quiz);
  const insightMarkdown = useMemo(() => sessionInsightMarkdown(session.content.synthesis), [session.content.synthesis]);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const toggleCollapsed = (id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const expandToSection = (id: string) => {
    setCollapsedIds((current) => expandTocPath(current, tocGroups, id));
  };
  const navigateToSection = (id: string) => {
    expandToSection(id);
    const targetHash = sessionSectionHref(session.id, id);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    window.setTimeout(() => scrollToPageSection(id), 0);
  };

  useEffect(() => {
    if (!section) return;
    setCollapsedIds((current) => expandTocPath(current, tocGroups, section));
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToPageSection(section));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [section, session.id, tocGroups]);

  return (
    <div className="session-detail">
      <article className="reader-column">
        <header className="reader-header">
          <div className="overview-copy">
            <Breadcrumb current="学习记录" />
            <h1>{session.title}</h1>
            <p className="page-intent reader-meta">
              <CalendarDays size={17} /> {session.capturedAt}
              <span>/</span>
              <FolderOpen size={17} /> {sourceLabel}
            </p>
          </div>
          <div className="pill-row">
            {session.topics.approved.map((topicId) => (
              <TopicPill id={topicId} key={topicId} />
            ))}
          </div>
        </header>

        {session.notebooklm.audio.status ? <AudioStatusPanel session={session} /> : null}

        {session.practice.mindmap ? (
          <CollapsibleBlock
            bodyClassName="mindmap-overview-body"
            collapsed={collapsedIds.has("mindmap")}
            className="reader-section mindmap-overview-section"
            id="mindmap"
            level={2}
            onToggle={toggleCollapsed}
            title="思维导图"
          >
            <MindmapTree node={session.practice.mindmap} />
          </CollapsibleBlock>
        ) : null}

        <CollapsibleBlock
          collapsed={collapsedIds.has("reading")}
          className="reader-section"
          id="reading"
          level={2}
          onToggle={toggleCollapsed}
          title="阅读"
        >
          <CollapsibleBlock
            bodyClassName="notebooklm-output-body"
            collapsed={collapsedIds.has("notebooklm")}
            className="reading-subblock notebooklm-output-block"
            id="notebooklm"
            level={3}
            onToggle={toggleCollapsed}
            tag="div"
            title="NotebookLM 输出"
          >
            <ContentBlock
              collapsedIds={collapsedIds}
              id="report"
              markdown={notebooklmOutputMarkdown(session.content.report)}
              onToggleHeading={toggleCollapsed}
              title="学习报告"
            />
            <ContentBlock
              collapsedIds={collapsedIds}
              id="topology"
              markdown={notebooklmOutputMarkdown(session.content.topology)}
              onToggleHeading={toggleCollapsed}
              title="知识拓扑"
            />
          </CollapsibleBlock>

          <CollapsibleBlock
            collapsed={collapsedIds.has("gpt-insight")}
            className="reading-subblock gpt-insight-block"
            id="gpt-insight"
            level={3}
            onToggle={toggleCollapsed}
            tag="div"
            title="GPT 洞察"
          >
            <MarkdownView
              collapsedIds={collapsedIds}
              headingBaseLevel={4}
              headingPrefix="insight"
              markdown={insightMarkdown}
              onToggleHeading={toggleCollapsed}
            />
          </CollapsibleBlock>
        </CollapsibleBlock>

        {hasPractice ? (
          <CollapsibleBlock
            collapsed={collapsedIds.has("practice")}
            className="reader-section"
            id="practice"
            level={2}
            onToggle={toggleCollapsed}
            subtitle="闪卡 / 测验"
            title="练习"
          >
            <PracticePanel session={session} />
          </CollapsibleBlock>
        ) : null}
      </article>
      <aside className="reader-rail" aria-label="页面目录">
        <SessionToc groups={tocGroups} onNavigate={navigateToSection} session={session} />
      </aside>
    </div>
  );
}

function AudioStatusPanel({ session }: { session: VaultSession }) {
  const audio = session.notebooklm.audio;
  const label = audioStatusLabel(audio.status, audio.shareUrl);
  const tone = audioStatusTone(audio.status, audio.shareUrl);

  return (
    <section className={`audio-status-panel ${tone}`} aria-label="Audio Overview 状态">
      <div className="audio-status-copy">
        <p className="rail-label">音频概要</p>
        <h2>{label}</h2>
        <p>{audio.shareUrl ? "NotebookLM 已完成音频生成，可跳转收听。" : "等待后续补档生成。"}</p>
      </div>
      <AudioOverviewLink audioUrl={audio.shareUrl} />
    </section>
  );
}

function AudioOverviewLink({ audioUrl }: { audioUrl: string }) {
  if (!audioUrl) {
    return <span className="audio-overview-button disabled">等待补档</span>;
  }

  return (
    <a className="audio-overview-button" href={audioUrl} target="_blank" rel="noreferrer" aria-label="在 NotebookLM 收听音频概要">
      <span>去 NotebookLM 收听</span>
      <ExternalLink size={16} />
    </a>
  );
}

function CollapsibleBlock({
  bodyClassName,
  children,
  className,
  collapsed,
  id,
  level,
  onToggle,
  subtitle,
  tag = "section",
  title,
}: {
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  collapsed: boolean;
  id: string;
  level: CollapsibleHeadingLevel;
  onToggle: (id: string) => void;
  subtitle?: string;
  tag?: "div" | "section";
  title: string;
}) {
  const Wrapper = tag;
  const HeadingTag = headingTag(level);
  const Icon = collapsed ? ChevronRight : ChevronDown;
  return (
    <Wrapper className={["collapsible-block", collapsed ? "is-collapsed" : "", className ?? ""].filter(Boolean).join(" ")} id={id}>
      <HeadingTag className="collapsible-title">
        <button aria-expanded={!collapsed} className="collapsible-title-button" onClick={() => onToggle(id)} type="button">
          <Icon aria-hidden="true" size={18} strokeWidth={2} />
          <span>{title}</span>
        </button>
      </HeadingTag>
      {subtitle ? <p className="collapsible-subtitle">{subtitle}</p> : null}
      <div className={["collapsible-body", bodyClassName ?? ""].filter(Boolean).join(" ")} hidden={collapsed}>
        {children}
      </div>
    </Wrapper>
  );
}

function ContentBlock({
  collapsedIds,
  id,
  markdown,
  onToggleHeading,
  title,
}: {
  collapsedIds: Set<string>;
  id: string;
  markdown: string;
  onToggleHeading: (id: string) => void;
  title: string;
}) {
  return (
    <section className="content-block reader-anchor" id={id} aria-label={title}>
      <MarkdownView
        collapsedIds={collapsedIds}
        headingBaseLevel={4}
        headingPrefix={id}
        markdown={markdown}
        onToggleHeading={onToggleHeading}
      />
    </section>
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
  const sortedTopics = useMemo(() => [...filteredTopics].sort(compareTopicsBySignal), [filteredTopics]);
  const topicGroups = [
    {
      label: "高频主题",
      detail: "被 2 篇及以上学习记录命中，按命中次数排列。",
      items: sortedTopics.filter((topic) => topic.count > 1),
    },
    {
      label: "构建中主题",
      detail: "目前只被 1 篇学习记录命中，等待后续材料继续确认。",
      items: sortedTopics.filter((topic) => topic.count <= 1),
    },
  ];

  return (
    <div className="page-stack">
      <header className="page-header">
        <div className="overview-copy">
          <Breadcrumb current="主题地图" />
          <h1>主题地图</h1>
          <p className="page-intent">按每条学习记录里确认过的主题自动汇总，用来承接跨记录综合。</p>
        </div>
      </header>
      <div className="overview-controls session-search-row" aria-label="主题搜索">
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索主题..."
            aria-label="搜索主题"
          />
        </label>
      </div>
      <div className="topic-map-strip">
        <Metric label="当前显示" value={`${filteredTopics.length}/${topics.length}`} />
        <Metric label="高频主题" value={`${topics.filter((topic) => topic.count > 1).length}`} />
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
      <span className="topic-card-head">
        <h2>{topic.title}</h2>
        <span className="topic-card-tags">
          <span>{topic.count} 条记录</span>
          <span>更新 {formatMonthDay(topic.latestDate)}</span>
        </span>
      </span>
      <p>{topicDigest(topic)}</p>
    </a>
  );
}

function TopicDetail({ topic }: { topic: VaultTopic }) {
  const currentUnderstanding = markdownSection(topic.markdown, "当前理解");
  const pending = markdownSection(topic.markdown, "待合并 / 待拆分");
  const related = relatedTopicsForTopic(topic).slice(0, 8);
  const navItems = [
    { id: "topic-understanding", label: "当前理解" },
    { id: "topic-sessions", label: "关联学习记录" },
    ...(pending ? [{ id: "topic-pending", label: "待合并 / 待拆分" }] : []),
  ];

  return (
    <div className="page-stack topic-detail-page">
      <header className="topic-detail-hero">
        <div className="overview-copy">
          <Breadcrumb current="主题地图" />
          <span className="topic-type">{topic.count > 1 ? "核心主题" : "单点线索"}</span>
          <h1>{topic.title}</h1>
        </div>
      </header>
      <div className="topic-detail-layout">
        <main className="topic-reader-column">
          <section className="topic-panel topic-understanding" id="topic-understanding">
            <SectionTitle title="当前理解" subtitle="从关联学习记录沉淀出的可复用判断" />
            <MarkdownView markdown={currentUnderstanding || topic.markdown} />
          </section>
          <section className="topic-panel topic-sessions-panel" id="topic-sessions">
            <SectionTitle title="关联学习记录" subtitle="由每条学习记录的主题标注汇总" />
            <div className="linked-session-list topic-session-list">
              {topic.sessions.map((session) => (
                <a href={href(`/sessions/${session.id}`)} key={session.id}>
                  <span>{session.title}</span>
                  <small>{formatMonthDay(session.capturedAt)}</small>
                </a>
              ))}
            </div>
          </section>
          {pending ? (
            <section className="topic-panel topic-understanding pending" id="topic-pending">
              <SectionTitle title="待合并 / 待拆分" />
              <MarkdownView markdown={pending} />
            </section>
          ) : null}
        </main>
        <aside className="topic-rail" aria-label="主题上下文">
          <TopicContextPanel relatedCount={related.length} topic={topic} />
          <TopicQuickNav items={navItems} />
        </aside>
      </div>
    </div>
  );
}

function TopicContextPanel({ relatedCount, topic }: { relatedCount: number; topic: VaultTopic }) {
  return (
    <section className="topic-context-panel" aria-label="主题上下文">
      <p className="rail-label">主题上下文</p>
      <div className="topic-context-title">
        <strong>{topic.title}</strong>
        <small>{topic.id}</small>
      </div>
      <div className="topic-context-stats">
        <span>
          <em>{topic.count}</em>
          <small>学习记录</small>
        </span>
        <span>
          <em>{formatMonthDay(topic.latestDate)}</em>
          <small>最近更新</small>
        </span>
        <span>
          <em>{relatedCount}</em>
          <small>关联主题</small>
        </span>
      </div>
    </section>
  );
}

function TopicQuickNav({ items }: { items: Array<{ id: string; label: string }> }) {
  return (
    <nav className="topic-quick-nav" aria-label="主题快速定位">
      <p className="rail-label">快速定位</p>
      <div>
        {items.map((item) => (
          <button key={item.id} onClick={() => scrollToPageSection(item.id)} type="button">
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function HealthPage() {
  const groups = groupFindings(healthData.findings);
  return (
    <div className="page-stack">
      <header className="page-header">
        <div className="overview-copy">
          <Breadcrumb current="健康检查" />
          <h1>Vault 健康检查</h1>
          <p className="page-intent">影响后续复盘的一致性检查，不以空泛健康分替代具体 finding。</p>
        </div>
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
  const { flashcards, quiz } = session.practice;

  return (
    <div className="practice-stack">
      {flashcards ? <FlashcardPractice artifact={flashcards} key={`${session.id}-flashcards`} /> : null}
      {quiz ? <QuizPractice artifact={quiz} key={`${session.id}-quiz`} /> : null}
    </div>
  );
}

function FlashcardPractice({ artifact }: { artifact: FlashcardsArtifact }) {
  const [order, setOrder] = useState(() => shuffledIndices(artifact.cards.length));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const currentCard = artifact.cards[order[currentIndex] ?? 0];

  if (!currentCard) return null;

  const goNext = () => {
    setRevealed(false);
    if (currentIndex + 1 >= order.length) {
      setOrder(shuffledIndices(artifact.cards.length));
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((current) => current + 1);
  };

  const recordAnswer = (correct: boolean) => {
    setScore((current) => ({
      correct: current.correct + (correct ? 1 : 0),
      wrong: current.wrong + (correct ? 0 : 1),
    }));
    goNext();
  };

  return (
    <section className="practice-block drill-block" id="flashcards">
      <PracticeHeader title={flashcardTitle(artifact.title)} score={score} progress={`${currentIndex + 1}/${artifact.cards.length}`} />
      <article className={`single-flashcard ${revealed ? "revealed" : ""}`}>
        <span className="drill-kicker">题面</span>
        <h4>{currentCard.front}</h4>
        {revealed ? (
          <div className="flashcard-answer">
            <span>答案</span>
            <p>{currentCard.back}</p>
          </div>
        ) : (
          <p className="quiet-copy">先在心里作答，再显示答案。</p>
        )}
      </article>
      <div className="drill-actions">
        {!revealed ? (
          <button className="drill-button primary" type="button" onClick={() => setRevealed(true)}>显示答案</button>
        ) : (
          <>
            <button className="drill-button good" type="button" onClick={() => recordAnswer(true)}>答对</button>
            <button className="drill-button danger" type="button" onClick={() => recordAnswer(false)}>答错</button>
          </>
        )}
      </div>
    </section>
  );
}

function QuizPractice({ artifact }: { artifact: QuizArtifact }) {
  const [order, setOrder] = useState(() => shuffledIndices(artifact.questions.length));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const currentQuestion = artifact.questions[order[currentIndex] ?? 0];

  if (!currentQuestion) return null;

  const correctOption = currentQuestion.answerOptions.find((option) => option.isCorrect);
  const selectedOption = selectedAnswer === null ? null : currentQuestion.answerOptions[selectedAnswer];
  const answered = selectedAnswer !== null;

  const chooseAnswer = (answerIndex: number) => {
    if (answered) return;
    const isCorrect = Boolean(currentQuestion.answerOptions[answerIndex]?.isCorrect);
    setSelectedAnswer(answerIndex);
    setScore((current) => ({
      correct: current.correct + (isCorrect ? 1 : 0),
      wrong: current.wrong + (isCorrect ? 0 : 1),
    }));
  };

  const goNext = () => {
    setSelectedAnswer(null);
    if (currentIndex + 1 >= order.length) {
      setOrder(shuffledIndices(artifact.questions.length));
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((current) => current + 1);
  };

  return (
    <section className="practice-block drill-block" id="quiz">
      <PracticeHeader title={artifact.title} score={score} progress={`${currentIndex + 1}/${artifact.questions.length}`} />
      <article className="quiz-panel">
        <div className="quiz-question">
          <span className="drill-kicker">题目</span>
          <h4>{currentQuestion.question}</h4>
          {currentQuestion.hint ? <p className="hint"><CircleHelp size={15} /> {currentQuestion.hint}</p> : null}
        </div>
        <div className="answer-list" aria-label="测验选项">
          {currentQuestion.answerOptions.map((option, answerIndex) => {
            const selected = selectedAnswer === answerIndex;
            const className = [
              "answer",
              answered && option.isCorrect ? "correct" : "",
              answered && selected && !option.isCorrect ? "wrong" : "",
              selected ? "selected" : "",
            ].filter(Boolean).join(" ");
            return (
              <button
                className={className}
                disabled={answered}
                key={option.text}
                type="button"
                onClick={() => chooseAnswer(answerIndex)}
              >
                <span>{selected ? "你的选择" : `选项 ${answerIndex + 1}`}</span>
                <p>{option.text}</p>
              </button>
            );
          })}
        </div>
        {answered ? (
          <div className={`quiz-feedback ${selectedOption?.isCorrect ? "correct" : "wrong"}`}>
            <strong>{selectedOption?.isCorrect ? "答对了" : "答错了"}</strong>
            <p>{selectedOption?.rationale || correctOption?.rationale || "已显示正确答案。"}</p>
          </div>
        ) : null}
      </article>
      <div className="drill-actions">
        <button className="drill-button" type="button" disabled={!answered} onClick={goNext}>下一题</button>
      </div>
    </section>
  );
}

function PracticeHeader({
  progress,
  score,
  title,
}: {
  progress: string;
  score: { correct: number; wrong: number };
  title: string;
}) {
  return (
    <div className="practice-header">
      <div>
        <h3>{title}</h3>
        <small>{progress}</small>
      </div>
      <p aria-label="本次练习计分">
        <span>对 {score.correct}</span>
        <span>错 {score.wrong}</span>
      </p>
    </div>
  );
}

function MindmapTree({ node }: { node: MindmapNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pendingScrollAnchorRef = useRef<{ id: string; left: number; top: number } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [viewportWidth, setViewportWidth] = useState(0);
  const layout = useMemo(() => buildMindmapLayout(node, expandedIds), [expandedIds, node]);
  const fitWidth = useMemo(() => visibleMindmapTierWidth(layout), [layout]);
  const scale = viewportWidth > 0 ? Math.min(1, Math.max(MINDMAP_MIN_SCALE, (viewportWidth - MINDMAP_FIT_MARGIN) / fitWidth)) : 1;
  const scaledLayout = useMemo(() => ({
    height: Math.ceil(layout.height * scale),
    width: Math.ceil(layout.width * scale),
  }), [layout.height, layout.width, scale]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateViewportWidth = () => setViewportWidth(viewport.clientWidth);
    updateViewportWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewportWidth);
      return () => window.removeEventListener("resize", updateViewportWidth);
    }

    const observer = new ResizeObserver(updateViewportWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const anchor = pendingScrollAnchorRef.current;
    const viewport = viewportRef.current;
    if (!anchor || !viewport) return;

    const target = viewport.querySelector<HTMLElement>(`[data-mindmap-node-id="${anchor.id}"]`);
    pendingScrollAnchorRef.current = null;
    if (!target) return;

    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    viewport.scrollLeft += targetRect.left - viewportRect.left - anchor.left;
    viewport.scrollTop += targetRect.top - viewportRect.top - anchor.top;
  }, [layout]);

  const toggleNode = (id: string, target: HTMLButtonElement) => {
    const viewport = viewportRef.current;
    if (viewport) {
      const viewportRect = viewport.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      pendingScrollAnchorRef.current = {
        id,
        left: targetRect.left - viewportRect.left,
        top: targetRect.top - viewportRect.top,
      };
    }

    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="mindmap-viewport" ref={viewportRef} aria-label={`${node.name} 思维导图`}>
      <div className="mindmap-tree-canvas" style={{ height: scaledLayout.height, minWidth: scaledLayout.width }}>
        <div className="mindmap-scale-plane" style={{ height: layout.height, transform: `scale(${scale})`, width: layout.width }}>
          <svg className="mindmap-svg" height={layout.height} width={layout.width} aria-hidden="true">
            {layout.links.map((link) => (
              <path
                className="mindmap-link"
                d={mindmapPath(link)}
                key={`${link.source.id}-${link.target.id}`}
              />
            ))}
          </svg>
          {layout.nodes.map((layoutNode) => (
            <MindmapNodeCard
              expanded={expandedIds.has(layoutNode.id)}
              key={layoutNode.id}
              node={layoutNode}
              onToggle={toggleNode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MindmapNodeCard({
  expanded,
  node,
  onToggle,
}: {
  expanded: boolean;
  node: MindmapLayoutNode;
  onToggle: (id: string, target: HTMLButtonElement) => void;
}) {
  const hasChildren = node.childCount > 0;
  const canToggle = hasChildren && node.depth > 0;
  const displayExpanded = node.depth === 0 || expanded;
  return (
    <button
      aria-expanded={hasChildren ? displayExpanded : undefined}
      className={[
        "mindmap-node-card",
        node.depth === 0 ? "root" : hasChildren ? "branch" : "leaf",
        hasChildren && displayExpanded ? "expanded" : "collapsed",
      ].join(" ")}
      disabled={!canToggle}
      data-mindmap-node-id={node.id}
      onClick={(event) => {
        if (canToggle) onToggle(node.id, event.currentTarget);
      }}
      style={{
        height: node.height,
        left: node.x,
        top: node.y - node.height / 2,
        width: node.width,
      }}
      title={node.name}
      type="button"
    >
      <span className="mindmap-node-toggle" aria-hidden="true">
        {canToggle ? (expanded ? "-" : "+") : ""}
      </span>
      <span className="mindmap-node-name">{node.name}</span>
      {hasChildren ? <span className="mindmap-node-count">{node.childCount}</span> : null}
    </button>
  );
}

function buildMindmapLayout(root: MindmapNode, expandedIds: Set<string>): MindmapLayout {
  const nodes: MindmapLayoutNode[] = [];
  const links: MindmapLayoutLink[] = [];
  const padding = 28;
  const rowGap = 12;
  const baseRowHeight = 64;
  const xGap = 292;
  let maxX = 0;

  const makeLayoutNode = (source: MindmapNode, pathParts: number[], depth: number, x: number, y: number): MindmapLayoutNode => {
    const width = depth === 0 ? 238 : depth === 1 ? 232 : 244;
    const height = source.children?.length ? 52 : 46;
    const layoutNode: MindmapLayoutNode = {
      childCount: source.children?.length ?? 0,
      depth,
      height,
      id: mindmapNodeId(pathParts),
      name: source.name,
      width,
      x,
      y,
    };
    maxX = Math.max(maxX, x + width);
    nodes.push(layoutNode);
    return layoutNode;
  };

  const layoutSubtree = (source: MindmapNode, pathParts: number[], depth: number, x: number, top: number) => {
    const id = mindmapNodeId(pathParts);
    const children = source.children ?? [];
    const expanded = depth === 0 || expandedIds.has(id);

    if (!children.length || !expanded) {
      return {
        height: baseRowHeight,
        node: makeLayoutNode(source, pathParts, depth, x, top + baseRowHeight / 2),
      };
    }

    let cursor = top;
    const childLayouts = children.map((child, index) => {
      const childLayout = layoutSubtree(child, [...pathParts, index], depth + 1, x + xGap, cursor);
      cursor += childLayout.height + rowGap;
      return childLayout;
    });
    const childrenHeight = Math.max(baseRowHeight, cursor - top - rowGap);
    const firstChild = childLayouts[0].node;
    const lastChild = childLayouts[childLayouts.length - 1].node;
    const nodeY = (firstChild.y + lastChild.y) / 2;
    const currentNode = makeLayoutNode(source, pathParts, depth, x, nodeY);

    childLayouts.forEach((childLayout) => {
      links.push({ source: currentNode, target: childLayout.node });
    });

    return {
      height: childrenHeight,
      node: currentNode,
    };
  };

  const rootLayout = layoutSubtree(root, [0], 0, padding, padding);
  return {
    height: Math.max(380, rootLayout.height + padding * 2),
    links,
    nodes,
    width: Math.max(760, maxX + padding),
  };
}

function visibleMindmapTierWidth(layout: MindmapLayout) {
  const visibleTierNodes = layout.nodes.filter((node) => node.depth <= 1);
  if (!visibleTierNodes.length) return layout.width;

  return Math.max(...visibleTierNodes.map((node) => node.x + node.width)) + MINDMAP_FIT_MARGIN;
}

function mindmapPath(link: MindmapLayoutLink) {
  const sourceX = link.source.x + link.source.width;
  const sourceY = link.source.y;
  const targetX = link.target.x - 10;
  const targetY = link.target.y;
  const middleX = sourceX + Math.max(48, (targetX - sourceX) * 0.45);

  return `M${sourceX},${sourceY} C${middleX},${sourceY} ${middleX},${targetY} ${targetX},${targetY}`;
}

function mindmapNodeId(pathParts: number[]) {
  return `mindmap-${pathParts.join("-")}`;
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

function matchesOverviewSession(session: VaultSession, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    session.title,
    session.originalTitle,
    session.author,
    session.sourceType,
    session.content.summary,
    session.whyItMatters,
    ...session.tags,
    ...session.topics.approved,
    ...session.topics.approved.map(topicTitle),
  ].join(" ").toLowerCase();
  return haystack.includes(needle);
}

function matchesOverviewTopic(topic: VaultTopic, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${topic.id} ${topic.title} ${topic.summary}`.toLowerCase().includes(needle);
}

function formatMonthDay(date?: string) {
  if (!date) return "暂无";
  return date.length >= 10 ? date.slice(5, 10) : date;
}

function audioStatusLabel(status: string, shareUrl: string) {
  if (shareUrl || status === "remote_completed_share_ready") return "播客已生成";
  if (status === "requested") return "已发起生成";
  if (status === "in_progress" || status === "pending") return "远端生成中";
  if (status === "failed") return "生成失败待复核";
  if (status === "not_found") return "尚未发现音频";
  return status || "未记录";
}

function audioStatusTone(status: string, shareUrl: string) {
  if (shareUrl || status === "remote_completed_share_ready") return "ready";
  if (status === "failed" || status === "not_found") return "warn";
  return "pending";
}

function compareTopicsBySignal(left: VaultTopic, right: VaultTopic) {
  const countDelta = right.count - left.count;
  if (countDelta !== 0) return countDelta;
  const dateDelta = (right.latestDate ?? "").localeCompare(left.latestDate ?? "");
  if (dateDelta !== 0) return dateDelta;
  return left.title.localeCompare(right.title, "zh-Hans-CN");
}

function topicDigest(topic: VaultTopic) {
  const summary = topic.summary.trim();
  if (summary && summary !== topic.title && summary !== topic.id) return summary;

  return "暂无稳定概述。";
}

function relatedTopicsForTopic(topic: VaultTopic): TopicRelatedSignal[] {
  const counts = new Map<string, number>();

  for (const link of topic.sessions) {
    const session = sessionById.get(link.id);
    if (!session) continue;
    for (const topicId of session.topics.approved) {
      if (topicId === topic.id || !topicById.has(topicId)) continue;
      counts.set(topicId, (counts.get(topicId) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([id, count]) => ({ id, count })).sort((left, right) => (
    right.count - left.count || topicTitle(left.id).localeCompare(topicTitle(right.id), "zh-Hans-CN")
  ));
}

function scrollToPageSection(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const top = element.getBoundingClientRect().top + window.scrollY - 18;
  window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
}

function sessionSectionHref(sessionId: string, sectionId: string) {
  return href(`/sessions/${sessionId}/${sectionId}`);
}

function expandTocPath(current: Set<string>, groups: SessionTocGroup[], targetId: string) {
  const path = findTocPath(groups, targetId);
  if (!path.length) return current;
  let changed = false;
  const next = new Set(current);
  path.forEach((id) => {
    if (next.delete(id)) changed = true;
  });
  return changed ? next : current;
}

function findTocPath(groups: SessionTocGroup[], targetId: string) {
  for (const group of groups) {
    if (group.id === targetId) return [group.id];
    const itemPath = findTocItemPath(group.items, targetId);
    if (itemPath.length) return [group.id, ...itemPath];
  }
  return [];
}

function findTocItemPath(items: SessionTocItem[], targetId: string): string[] {
  for (const item of items) {
    if (item.id === targetId) return [item.id];
    const childPath = findTocItemPath(item.children ?? [], targetId);
    if (childPath.length) return [item.id, ...childPath];
  }
  return [];
}

function strongestRelatedSessions(session: VaultSession): SessionRelatedItem[] {
  const currentTopics = new Set(session.topics.approved);
  if (!currentTopics.size) return [];

  return sessions
    .filter((candidate) => candidate.id !== session.id)
    .map((candidate) => {
      const sharedTopics = candidate.topics.approved.filter((topicId) => currentTopics.has(topicId));
      return {
        session: candidate,
        overlap: sharedTopics.length,
        sharedTopics,
      };
    })
    .filter((item) => item.overlap > 0)
    .sort((left, right) => {
      if (right.overlap !== left.overlap) return right.overlap - left.overlap;
      return latestFirst(left.session, right.session);
    })
    .slice(0, 5);
}

function buildSessionTocGroups(session: VaultSession): SessionTocGroup[] {
  const insightItems = buildMarkdownTocItems(sessionInsightMarkdown(session.content.synthesis), "insight", 1, 3);
  const reportItems = buildMarkdownTocItems(notebooklmOutputMarkdown(session.content.report), "report", 1, 3);
  const topologyItems = buildMarkdownTocItems(notebooklmOutputMarkdown(session.content.topology), "topology", 1, 3);
  const groups: SessionTocGroup[] = [];

  if (session.practice.mindmap) {
    groups.push({
      id: "mindmap",
      label: "思维导图",
      icon: GitBranch,
      items: [],
    });
  }

  groups.push({
    id: "reading",
    label: "阅读",
    icon: BookOpen,
    items: [
      {
        id: "notebooklm",
        label: "NotebookLM 输出",
        children: [...reportItems, ...topologyItems],
      },
      {
        id: "gpt-insight",
        label: "GPT 洞察",
        children: insightItems,
      },
    ],
  });

  if (session.practice.flashcards || session.practice.quiz) {
    groups.push(
    {
      id: "practice",
      label: "练习",
      icon: Sparkles,
      items: [
        { id: "flashcards", label: "闪卡" },
        { id: "quiz", label: "测验" },
      ],
    },
  );
  }

  return groups;
}

function buildMarkdownTocItems(markdown: string, prefix: string, minLevel: number, maxLevel: number) {
  const headings = extractMarkdownHeadings(markdown, prefix)
    .filter((heading) => heading.level >= minLevel && heading.level <= maxLevel);
  const roots: SessionTocItem[] = [];
  const stack: Array<{ level: number; item: SessionTocItem }> = [];

  for (const heading of headings) {
    const item: SessionTocItem = { id: heading.id, label: heading.label };
    while (stack.length && stack[stack.length - 1].level >= heading.level) stack.pop();
    const parent = stack[stack.length - 1]?.item;
    if (parent) {
      parent.children = [...(parent.children ?? []), item];
    } else {
      roots.push(item);
    }
    stack.push({ level: heading.level, item });
  }

  return roots;
}

function extractMarkdownHeadings(markdown: string, prefix: string) {
  const lines = stripFrontmatter(markdown).split("\n");
  const headings: Array<{ id: string; label: string; level: number }> = [];
  let headingIndex = 0;

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line.trim());
    if (!match) continue;
    headingIndex += 1;
    headings.push({
      id: headingId(prefix, headingIndex),
      label: localizedHeading(plainHeading(match[2])),
      level: match[1].length,
    });
  }

  return headings.filter((heading) => heading.label.length > 0);
}

function MarkdownView({
  collapsedIds = EMPTY_COLLAPSED_IDS,
  headingBaseLevel = 1,
  headingPrefix,
  markdown,
  onToggleHeading,
}: {
  collapsedIds?: Set<string>;
  headingBaseLevel?: number;
  headingPrefix?: string;
  markdown: string;
  onToggleHeading?: (id: string) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const html = useMemo(() => {
    const cleaned = stripFrontmatter(markdown).trim();
    const parsed = marked.parse(cleaned || "_暂无内容_", { async: false }) as string;
    return headingPrefix ? addHeadingIds(parsed, headingPrefix, headingBaseLevel) : parsed;
  }, [headingBaseLevel, headingPrefix, markdown]);

  useEffect(() => {
    if (!onToggleHeading) return;
    const body = bodyRef.current;
    if (!body) return;
    enhanceMarkdownHeadings(body, collapsedIds, onToggleHeading);
  }, [collapsedIds, html, onToggleHeading]);

  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} ref={bodyRef} />;
}

function addHeadingIds(html: string, prefix: string, baseLevel = 1) {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading, index) => {
    const sourceLevel = Number(heading.tagName.slice(1));
    const targetLevel = Math.min(6, Math.max(1, baseLevel + sourceLevel - 1));
    const localized = localizedHeading(heading.textContent ?? "");
    const target = document.createElement(`h${targetLevel}`);
    Array.from(heading.attributes).forEach((attribute) => target.setAttribute(attribute.name, attribute.value));
    while (heading.firstChild) target.appendChild(heading.firstChild);
    heading.replaceWith(target);
    target.id = headingId(prefix, index + 1);
    if (localized && localized !== target.textContent?.trim()) {
      target.textContent = localized;
    }
  });
  return template.innerHTML;
}

function enhanceMarkdownHeadings(
  body: HTMLDivElement,
  collapsedIds: Set<string>,
  onToggleHeading: (id: string) => void,
) {
  const headings = Array.from(body.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"));
  headings.forEach((heading) => {
    if (!heading.id) return;
    heading.classList.add("collapsible-markdown-heading");
    let button = heading.querySelector<HTMLButtonElement>(":scope > button.collapsible-markdown-button");
    if (!button) {
      const label = document.createElement("span");
      label.className = "collapsible-markdown-label";
      while (heading.firstChild) label.appendChild(heading.firstChild);
      const arrow = document.createElement("span");
      arrow.className = "collapsible-markdown-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.innerHTML = '<svg class="collapsible-markdown-arrow-icon" viewBox="0 0 12 12" focusable="false"><path d="M2.45 4.25 Q2.08 4.25 2.28 4.56 L5.45 8.18 Q6 8.82 6.55 8.18 L9.72 4.56 Q9.92 4.25 9.55 4.25 Z" /></svg>';
      button = document.createElement("button");
      button.className = "collapsible-markdown-button";
      button.type = "button";
      button.append(arrow, label);
      heading.appendChild(button);
    }
    const collapsed = collapsedIds.has(heading.id);
    button.setAttribute("aria-expanded", String(!collapsed));
    const arrow = button.querySelector<HTMLElement>(".collapsible-markdown-arrow");
    if (arrow) arrow.dataset.state = collapsed ? "collapsed" : "expanded";
    button.onclick = () => onToggleHeading(heading.id);
  });

  let hiddenLevels: number[] = [];
  Array.from(body.children).forEach((element) => {
    const headingLevel = markdownHeadingLevel(element);
    if (headingLevel) {
      hiddenLevels = hiddenLevels.filter((level) => level < headingLevel);
      element.toggleAttribute("hidden", hiddenLevels.length > 0);
      if (element.id && collapsedIds.has(element.id)) hiddenLevels.push(headingLevel);
      return;
    }
    element.toggleAttribute("hidden", hiddenLevels.length > 0);
  });
}

function headingId(prefix: string, index: number) {
  return `${prefix}-heading-${index}`;
}

function headingTag(level: CollapsibleHeadingLevel) {
  return `h${level}` as "h2" | "h3" | "h4" | "h5" | "h6";
}

function markdownHeadingLevel(element: Element) {
  return /^H[1-6]$/.test(element.tagName) ? Number(element.tagName.slice(1)) : 0;
}

function stripFrontmatter(markdown: string) {
  return markdown.replace(/^---[\s\S]*?---\s*/, "");
}

function plainHeading(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function localizedHeading(heading: string) {
  return MARKDOWN_HEADING_TRANSLATIONS.get(heading.trim().toLowerCase()) ?? heading.trim();
}

function cleanSessionSynthesisMarkdown(markdown: string) {
  return removeMarkdownSections(markdown, ["关联 topics", "关联 topic", "topics", "公开价值"]);
}

function sessionInsightMarkdown(markdown: string) {
  return removeMarkdownSections(cleanSessionSynthesisMarkdown(markdown), [
    "来源证据",
    "来源事实",
    "source facts",
    "notebooklm 归纳",
    "notebooklm synthesis",
    "topic 归档",
    "topic archive",
  ]);
}

function notebooklmOutputMarkdown(markdown: string) {
  return removeMarkdownSections(markdown, ["Agent 推断", "Agent inference", "用户原话"]);
}

function removeMarkdownSections(markdown: string, headings: string[]) {
  const normalizedHeadings = new Set(headings.map((heading) => heading.trim().toLowerCase()));
  const lines = markdown.split("\n");
  const kept: string[] = [];
  let skipLevel = 0;

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.+?)\s*$/.exec(line.trim());
    if (headingMatch) {
      const level = headingMatch[1].length;
      const heading = headingMatch[2].trim().toLowerCase();
      if (skipLevel && level <= skipLevel) skipLevel = 0;
      if (!skipLevel && normalizedHeadings.has(heading)) {
        skipLevel = level;
        continue;
      }
    }
    if (!skipLevel) kept.push(line);
  }

  return kept.join("\n").trim();
}

function shuffledIndices(length: number) {
  const indices = Array.from({ length }, (_, index) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }
  return indices;
}

function flashcardTitle(title: string) {
  const normalized = title.replace(/抽认卡/g, "闪卡").trim();
  return normalized.includes("闪卡") ? normalized : `${normalized || "练习"}闪卡`;
}

function TopicPill({ id }: { id: string }) {
  return (
    <a className="topic-pill" href={href(`/topics/${id}`)}>
      {topicTitle(id)}
    </a>
  );
}

function topicTitle(id: string) {
  return topicById.get(id)?.title ?? id;
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
        {finding.topicId ? `主题：${topicTitle(finding.topicId)}` : ""}
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
        <div className="overview-copy">
          <Breadcrumb current="未找到" />
          <h1>未找到 {label}</h1>
          <p className="page-intent">{value}</p>
        </div>
      </header>
      <a className="text-link" href={href("/")}>回概览</a>
    </div>
  );
}

function buildKnowledgeGraph(): GraphData<KnowledgeGraphNode, KnowledgeGraphLink> {
  const topicNodes: KnowledgeGraphNode[] = topics.map((topic) => ({
    id: `topic:${topic.id}`,
    entityId: topic.id,
    label: topic.title,
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

function filterKnowledgeGraph(
  graphData: GraphData<KnowledgeGraphNode, KnowledgeGraphLink>,
  query: string,
): GraphData<KnowledgeGraphNode, KnowledgeGraphLink> {
  const hasQuery = query.trim().length > 0;
  if (!hasQuery) return graphData;
  const matches = graphSearchMatches(graphData, query);
  if (!matches.length) return { nodes: [], links: [] };

  const includedIds = new Set(matches.map((node) => String(node.id)));
  for (const link of graphData.links) {
    const source = graphEndpointId(link.source);
    const target = graphEndpointId(link.target);
    if (includedIds.has(source) || includedIds.has(target)) {
      includedIds.add(source);
      includedIds.add(target);
    }
  }

  return {
    nodes: graphData.nodes.filter((node) => includedIds.has(String(node.id))),
    links: graphData.links
      .map((link) => ({ ...link }))
      .filter((link) => includedIds.has(graphEndpointId(link.source)) && includedIds.has(graphEndpointId(link.target))),
  };
}

function graphSearchMatches(
  graphData: GraphData<KnowledgeGraphNode, KnowledgeGraphLink>,
  query: string,
) {
  const needle = query.trim().toLowerCase();
  return graphData.nodes
    .filter((node) => {
      if (!needle) return true;
      return `${node.label} ${node.entityId} ${node.date ?? ""}`.toLowerCase().includes(needle);
    })
    .sort((left, right) => {
      const countDelta = (right.count ?? 0) - (left.count ?? 0);
      if (countDelta !== 0) return countDelta;
      const dateDelta = (right.date ?? "").localeCompare(left.date ?? "");
      if (dateDelta !== 0) return dateDelta;
      return left.label.localeCompare(right.label, "zh-Hans-CN");
    });
}

function layoutKnowledgeGraph(
  graphData: GraphData<KnowledgeGraphNode, KnowledgeGraphLink>,
  width: number,
  height: number,
): GraphData<KnowledgeGraphNode, KnowledgeGraphLink> {
  const nodeCount = graphData.nodes.length;
  if (!nodeCount) return graphData;

  const wide = width >= height;
  const xSpan = Math.max(320, width * (wide ? 0.94 : 0.62));
  const ySpan = Math.max(280, height * (wide ? 0.74 : 0.92));
  const degreeById = new Map(graphData.nodes.map((node) => [String(node.id), 0]));
  const linksByTopic = new Map<string, string[]>();

  for (const link of graphData.links) {
    const sourceId = graphEndpointId(link.source);
    const targetId = graphEndpointId(link.target);
    degreeById.set(sourceId, (degreeById.get(sourceId) ?? 0) + 1);
    degreeById.set(targetId, (degreeById.get(targetId) ?? 0) + 1);
    if (!linksByTopic.has(targetId)) linksByTopic.set(targetId, []);
    linksByTopic.get(targetId)?.push(sourceId);
  }

  const sessionNodes = graphData.nodes
    .filter((node) => node.kind === "session")
    .sort((left, right) => (degreeById.get(String(right.id)) ?? 0) - (degreeById.get(String(left.id)) ?? 0) || left.label.localeCompare(right.label, "zh-Hans-CN"));
  const sessionAnchors = new Map<string, { x: number; y: number }>();

  sessionNodes.forEach((node, index) => {
    const progress = sessionNodes.length <= 1 ? 0.5 : index / (sessionNodes.length - 1);
    const wave = Math.sin((index + 1) * 1.9);
    const x = wave * xSpan * (wide ? 0.18 : 0.28);
    const y = (progress - 0.5) * ySpan * (wide ? 0.66 : 0.52) + Math.cos((index + 1) * 1.31) * 22;
    sessionAnchors.set(String(node.id), { x, y });
  });

  const nodes = graphData.nodes.map((node) => {
    const id = String(node.id);
    const degree = degreeById.get(id) ?? 1;
    const seed = hashUnit(id);
    let anchorX = 0;
    let anchorY = 0;

    if (node.kind === "session") {
      const anchor = sessionAnchors.get(id) ?? { x: 0, y: 0 };
      anchorX = anchor.x;
      anchorY = anchor.y;
    } else {
      const linkedSessions = linksByTopic.get(id) ?? [];
      const base = linkedSessions.reduce(
        (position, sessionId) => {
          const anchor = sessionAnchors.get(sessionId);
          if (!anchor) return position;
          return { x: position.x + anchor.x, y: position.y + anchor.y, count: position.count + 1 };
        },
        { x: 0, y: 0, count: 0 },
      );
      const angle = seed * Math.PI * 2;
      const orbit = 126 + degree * 18 + hashUnit(`${id}:orbit`) * 74;
      anchorX = (base.count ? base.x / base.count : 0) + Math.cos(angle) * orbit * (wide ? 1.72 : 0.82);
      anchorY = (base.count ? base.y / base.count : 0) + Math.sin(angle) * orbit * (wide ? 0.88 : 1.42);
    }

    anchorX = clamp(anchorX, -xSpan / 2, xSpan / 2);
    anchorY = clamp(anchorY, -ySpan / 2, ySpan / 2);
    const jitter = 20 + hashUnit(`${id}:jitter`) * 24;
    const x = anchorX + Math.cos(seed * Math.PI * 12) * jitter;
    const y = anchorY + Math.sin(seed * Math.PI * 10) * jitter;
    return { ...node, x, y, anchorX, anchorY };
  });

  return {
    nodes,
    links: graphData.links.map((link) => ({ ...link })),
  };
}

function configureKnowledgeGraphForces(
  graph: ForceGraphMethods<KnowledgeGraphNode, KnowledgeGraphLink>,
  width: number,
  height: number,
) {
  const wide = width >= height;
  const charge = graph.d3Force("charge") as
    | { strength?: (value: number | ((node: NodeObject<KnowledgeGraphNode>) => number)) => unknown; distanceMin?: (value: number) => unknown; distanceMax?: (value: number) => unknown }
    | undefined;
  const link = graph.d3Force("link") as
    | { distance?: (value: number | ((link: LinkObject<KnowledgeGraphNode, KnowledgeGraphLink>) => number)) => unknown; strength?: (value: number | ((link: LinkObject<KnowledgeGraphNode, KnowledgeGraphLink>) => number)) => unknown; iterations?: (value: number) => unknown }
    | undefined;
  const center = graph.d3Force("center") as
    | { strength?: (value: number) => unknown }
    | undefined;

  charge?.strength?.((node: NodeObject<KnowledgeGraphNode>) => {
    const degree = Math.max(1, node.count ?? 1);
    return node.kind === "session" ? -360 - degree * 18 : -260 - degree * 13;
  });
  charge?.distanceMin?.(34);
  charge?.distanceMax?.(Math.max(width, height) * 0.9);
  link?.distance?.((link: LinkObject<KnowledgeGraphNode, KnowledgeGraphLink>) => {
    const source = graphEndpointNode(link.source);
    const target = graphEndpointNode(link.target);
    const degree = Math.max(source?.count ?? 1, target?.count ?? 1);
    return (wide ? 126 : 96) + degree * (wide ? 13 : 9);
  });
  link?.strength?.((link: LinkObject<KnowledgeGraphNode, KnowledgeGraphLink>) => {
    const source = graphEndpointNode(link.source);
    const target = graphEndpointNode(link.target);
    const degree = Math.max(source?.count ?? 1, target?.count ?? 1);
    return Math.max(0.03, 0.088 - degree * 0.006);
  });
  link?.iterations?.(2);
  center?.strength?.(0.035);
  graph.d3Force("soft-collide", createSoftCollisionForce());
  graph.d3Force("organic-frame", createOrganicFrameForce(width, height));
  graph.d3ReheatSimulation();
}

function createSoftCollisionForce() {
  let graphNodes: NodeObject<KnowledgeGraphNode>[] = [];

  const force = (alpha: number) => {
    for (let leftIndex = 0; leftIndex < graphNodes.length; leftIndex += 1) {
      const left = graphNodes[leftIndex];
      for (let rightIndex = leftIndex + 1; rightIndex < graphNodes.length; rightIndex += 1) {
        const right = graphNodes[rightIndex];
        const dx = (right.x ?? 0) - (left.x ?? 0);
        const dy = (right.y ?? 0) - (left.y ?? 0);
        const distance = Math.hypot(dx, dy) || 1;
        const minDistance = knowledgeNodeRadius(left) + knowledgeNodeRadius(right) + 20;
        if (distance >= minDistance) continue;

        const push = ((minDistance - distance) / distance) * alpha * 0.42;
        const offsetX = dx * push;
        const offsetY = dy * push;
        left.vx = (left.vx ?? 0) - offsetX;
        left.vy = (left.vy ?? 0) - offsetY;
        right.vx = (right.vx ?? 0) + offsetX;
        right.vy = (right.vy ?? 0) + offsetY;
      }
    }
  };

  force.initialize = (nodes: NodeObject<KnowledgeGraphNode>[]) => {
    graphNodes = nodes;
  };

  return force;
}

function createOrganicFrameForce(width: number, height: number) {
  let graphNodes: NodeObject<KnowledgeGraphNode>[] = [];
  const wide = width >= height;
  const xLimit = Math.max(160, width * (wide ? 0.45 : 0.36));
  const yLimit = Math.max(150, height * (wide ? 0.36 : 0.46));

  const force = (alpha: number) => {
    for (const node of graphNodes) {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const anchorX = node.anchorX ?? 0;
      const anchorY = node.anchorY ?? 0;
      node.vx = (node.vx ?? 0) + (anchorX - x) * alpha * (node.kind === "session" ? 0.01 : 0.017);
      node.vy = (node.vy ?? 0) + (anchorY - y) * alpha * (node.kind === "session" ? 0.01 : 0.017);

      const outsideX = Math.max(0, Math.abs(x) - xLimit);
      if (outsideX) node.vx = (node.vx ?? 0) - Math.sign(x) * outsideX * alpha * 0.08;
      const outsideY = Math.max(0, Math.abs(y) - yLimit);
      if (outsideY) node.vy = (node.vy ?? 0) - Math.sign(y) * outsideY * alpha * 0.08;
    }
  };

  force.initialize = (nodes: NodeObject<KnowledgeGraphNode>[]) => {
    graphNodes = nodes;
  };

  return force;
}

function hashUnit(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildKnowledgeGraphHoverState(
  graphData: GraphData<KnowledgeGraphNode, KnowledgeGraphLink>,
  hovered: NodeObject<KnowledgeGraphNode> | null,
): KnowledgeGraphHoverState {
  if (!hovered?.id) {
    return { nodeIds: new Set(), related: [] };
  }

  const hoveredId = String(hovered.id);
  const nodeIds = new Set<string>([hoveredId]);
  const relatedIds: string[] = [];
  const nodeById = new Map(graphData.nodes.map((node) => [node.id, node]));

  for (const link of graphData.links) {
    const source = graphEndpointId(link.source);
    const target = graphEndpointId(link.target);
    if (source === hoveredId && target) {
      nodeIds.add(target);
      relatedIds.push(target);
    } else if (target === hoveredId && source) {
      nodeIds.add(source);
      relatedIds.push(source);
    }
  }

  return {
    nodeIds,
    related: [...new Set(relatedIds)]
      .map((id) => nodeById.get(id))
      .filter((node): node is NodeObject<KnowledgeGraphNode> => Boolean(node))
      .sort((left, right) => left.kind.localeCompare(right.kind) || left.label.localeCompare(right.label)),
  };
}

function graphEndpointId(endpoint: string | number | NodeObject<KnowledgeGraphNode> | undefined) {
  return typeof endpoint === "object" ? String(endpoint.id) : String(endpoint ?? "");
}

function graphEndpointNode(endpoint: string | number | NodeObject<KnowledgeGraphNode> | undefined) {
  return typeof endpoint === "object" ? endpoint : undefined;
}

function graphLinkRelated(link: LinkObject<KnowledgeGraphNode, KnowledgeGraphLink>, hoverState: KnowledgeGraphHoverState) {
  if (!hoverState.nodeIds.size) return false;
  return hoverState.nodeIds.has(graphEndpointId(link.source)) && hoverState.nodeIds.has(graphEndpointId(link.target));
}

function graphLinkColor(link: LinkObject<KnowledgeGraphNode, KnowledgeGraphLink>, hoverState: KnowledgeGraphHoverState) {
  if (!hoverState.nodeIds.size) return "rgba(90, 102, 94, 0.34)";
  return graphLinkRelated(link, hoverState) ? "rgba(26, 124, 78, 0.72)" : "rgba(130, 136, 130, 0.12)";
}

function graphLinkWidth(link: LinkObject<KnowledgeGraphNode, KnowledgeGraphLink>, hoverState: KnowledgeGraphHoverState) {
  if (!hoverState.nodeIds.size) return 1.05;
  return graphLinkRelated(link, hoverState) ? 2.35 : 0.7;
}

function drawKnowledgeNode(
  node: NodeObject<KnowledgeGraphNode>,
  context: CanvasRenderingContext2D,
  globalScale: number,
  hoverState: KnowledgeGraphHoverState,
  hoveredId: string | null,
) {
  const radius = knowledgeNodeRadius(node);
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const isTopic = node.kind === "topic";
  const isHovering = hoverState.nodeIds.size > 0;
  const isRelated = !isHovering || hoverState.nodeIds.has(String(node.id));
  const isSelected = isHovering && String(node.id) === [...hoverState.nodeIds][0];
  const isHovered = hoveredId === String(node.id);

  context.save();
  context.globalAlpha = isRelated ? 1 : 0.22;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = isTopic ? "#2fac69" : "#8fa0b3";
  context.fill();

  context.lineWidth = isSelected ? 3 : isRelated ? 1.6 : 0.9;
  context.strokeStyle = isSelected
    ? "#155b3c"
    : isTopic
      ? "rgba(39, 117, 76, 0.62)"
      : "rgba(77, 91, 107, 0.5)";
  context.stroke();

  if (isSelected) {
    context.beginPath();
    context.arc(x, y, radius + 5, 0, Math.PI * 2);
    context.strokeStyle = "rgba(21, 91, 60, 0.3)";
    context.lineWidth = 5;
    context.stroke();
  }
  context.restore();

  if (isHovering && isRelated) {
    drawKnowledgeNodeLabel(node, context, globalScale, radius, isSelected || isHovered);
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
  if (node.kind === "topic") return 6.8 + Math.min(node.count, 6) * 2.15;
  return 8.2 + Math.min(node.count, 4) * 0.25;
}

function drawKnowledgeNodeLabel(
  node: NodeObject<KnowledgeGraphNode>,
  context: CanvasRenderingContext2D,
  globalScale: number,
  radius: number,
  prominent = false,
) {
  const label = truncateLabel(node.label, prominent ? (node.kind === "topic" ? 22 : 28) : (node.kind === "topic" ? 18 : 22));
  const fontSize = (prominent ? 12 : 10.5) / globalScale;
  const paddingX = (prominent ? 7 : 6) / globalScale;
  const paddingY = (prominent ? 5 : 4) / globalScale;
  const gap = (prominent ? 8 : 7) / globalScale;
  const corner = 5 / globalScale;
  const x = node.x ?? 0;
  const y = node.y ?? 0;

  context.save();
  context.font = `${prominent ? 700 : 600} ${fontSize}px Inter, system-ui, sans-serif`;
  const textWidth = context.measureText(label).width;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;
  const boxX = x - boxWidth / 2;
  const boxY = y - radius - gap - boxHeight;

  context.globalAlpha = 1;
  drawRoundedRect(context, boxX, boxY, boxWidth, boxHeight, corner);
  context.fillStyle = prominent ? "rgba(255, 255, 252, 0.96)" : "rgba(255, 255, 252, 0.88)";
  context.fill();
  context.strokeStyle = prominent ? "rgba(70, 77, 70, 0.2)" : "rgba(70, 77, 70, 0.12)";
  context.lineWidth = 1 / globalScale;
  context.stroke();
  context.fillStyle = prominent ? "#151713" : "#2f352f";
  context.fillText(label, boxX + paddingX, boxY + paddingY + fontSize * 0.82);
  context.restore();
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
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
  if (sort === "earliest") return latestFirst(right, left);
  return latestFirst(left, right);
}

function groupSessionsByDate(items: VaultSession[]) {
  const groups: Array<{ date: string; sessions: VaultSession[] }> = [];

  for (const session of items) {
    const date = session.capturedAt || "暂无日期";
    const last = groups[groups.length - 1];
    if (last?.date === date) {
      last.sessions.push(session);
    } else {
      groups.push({ date, sessions: [session] });
    }
  }

  return groups;
}

function latestFirst(left: VaultSession, right: VaultSession) {
  return right.capturedAt.localeCompare(left.capturedAt) || left.title.localeCompare(right.title);
}

function sessionSourceMeta(session: VaultSession) {
  const author = compactAuthorLabel(session.author);
  const platform = sourcePlatformLabel(session.url, session.sourceType);
  const display = [author, platform].filter(Boolean).join(" / ");
  const full = [session.author, platform || sourceDomain(session.url) || session.sourceType].filter(Boolean).join(" / ");
  return {
    display: display || session.sourceType || "来源",
    full: full || display || session.sourceType || "来源",
  };
}

function compactAuthorLabel(author: string) {
  const normalized = author.trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  const titledShowHost = normalized.match(/^the\s+.+\s+with\s+(.+)$/i);
  if (titledShowHost?.[1]) return titledShowHost[1].trim();

  return normalized;
}

function sourcePlatformLabel(url: string, sourceType: string) {
  const domain = sourceDomain(url);
  if (domain === "youtube.com" || domain === "youtu.be" || sourceType === "youtube") return "YouTube";
  return domain || sourceType;
}

function sourceDomain(url: string) {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
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
  if (finding.type === "missing_session_title_zh") return "补齐学习记录中文标题";
  if (finding.type === "missing_topic_title_zh") return "补齐主题中文标题";
  if (finding.type === "missing_session_reference") return "补上主题里的学习记录引用";
  if (finding.type === "artifact_missing_path") return "补齐缺失练习素材";
  if (finding.type === "broken_local_link") return "修复本地 Markdown 链接";
  return finding.type.replace(/_/g, " ");
}

function healthGroupLabel(type: string) {
  if (type === "missing_primary_source_id_inferred") return "来源编号可补全";
  if (type === "multiple_source_ids") return "来源需要确认";
  if (type === "missing_session_title_zh") return "中文学习记录标题缺失";
  if (type === "missing_topic_title_zh") return "中文主题标题缺失";
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
  if (finding.type === "missing_session_title_zh") {
    return "这条记录只有原始标题，缺少给 Viewer 展示用的中文标题。";
  }
  if (finding.type === "missing_topic_title_zh") {
    return "这个主题索引的一级标题还不是中文；目录 id 可以保持英文 slug。";
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
