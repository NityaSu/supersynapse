"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  askMemories,
  createMemory,
  createSpace,
  deleteMemory,
  deleteSpace,
  getAllMemories,
  getSpaces,
  searchMemories,
  updateMemory,
} from "@/lib/api";
import { labelize } from "@/lib/format";
import type { Memory } from "@/lib/memories";
import { spaceStyle } from "@/lib/space-style";
import type { Space } from "@/lib/spaces";
import type { FilterId, SearchMode, Theme, ViewMode } from "@/lib/types";

const THEME_KEY = "ss-theme";
const FAVORITES_KEY = "ss-favorites";

function loadFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

type WorkspaceValue = {
  spaces: Space[];
  memories: Memory[];
  loading: boolean;
  visibleSpace: string;
  visibleAddSpace: string;
  currentFilter: FilterId;
  semanticMode: boolean;
  viewMode: ViewMode;
  searchQuery: string;
  searchMode: SearchMode | null;
  favorites: Set<string>;
  theme: Theme;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  addOpen: boolean;
  cmdOpen: boolean;
  detail: Memory | null;
  filtered: Memory[];
  related: Memory[];
  counts: Record<string, number>;
  digest: string;
  retrieval: string;
  viewTitle: string;
  viewSubtitle: string;
  toast: string | null;
  toastOn: boolean;
  setCurrentFilter: (id: FilterId) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (q: string) => void;
  setSidebarOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  setRightPanelOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  setAddOpen: (open: boolean) => void;
  setCmdOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  setSpace: (space: string) => void;
  setAddSpace: (space: string) => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  closeOverlays: () => void;
  toggleTheme: () => void;
  toggleSemantic: () => void;
  toggleFavorite: (id: string) => void;
  showToast: (msg: string) => void;
  refresh: () => Promise<void>;
  addMemory: (content: string, space: string) => Promise<void>;
  saveMemory: (id: string, content: string) => Promise<boolean>;
  removeMemory: (id: string) => Promise<void>;
  addSpace: (name: string) => Promise<string | null>;
  removeSpace: () => Promise<void>;
  ask: (question: string) => Promise<{ answer: string; citations: Memory[] }>;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [currentSpace, setCurrentSpace] = useState("all");
  const [currentFilter, setCurrentFilter] = useState<FilterId>("all");
  const [semanticMode, setSemanticMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<Memory[] | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<Theme>("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastOn, setToastOn] = useState(false);
  const [addSpaceName, setAddSpaceName] = useState("default");
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(0);
  const toastTimer = useRef<number | null>(null);
  const searchTimer = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setToastOn(true);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOn(false), 2500);
  }, []);

  const refresh = useCallback(async () => {
    const list = await getSpaces();
    setSpaces(list);
    setMemories(await getAllMemories(list));
    setNowMs(Date.now());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setFavorites(loadFavorites());
      const stored = localStorage.getItem(THEME_KEY);
      const next: Theme = stored === "dark" ? "dark" : "light";
      setTheme(next);
      document.documentElement.setAttribute("data-theme", next);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async mount load
    void refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const visibleSpace =
    currentSpace === "all" || spaces.some((s) => s.name === currentSpace)
      ? currentSpace
      : "all";
  const visibleAddSpace = spaces.some((s) => s.name === addSpaceName)
    ? addSpaceName
    : (spaces[0]?.name ?? "default");

  const runSemanticSearch = useCallback(
    async (q: string, space: string, list: Space[]) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setSearchHits(null);
        setSearchMode(null);
        return;
      }
      const tags = space === "all" ? list.map((s) => s.name) : [space];
      const responses = await Promise.all(
        tags.map((tag) => searchMemories(trimmed, tag))
      );
      const byId = new Map<string, Memory>();
      let mode: SearchMode = "keyword";
      for (const data of responses) {
        if (data.mode === "semantic" || data.mode === "hybrid") mode = data.mode;
        for (const memory of data.results ?? []) {
          const prev = byId.get(memory.id);
          if (!prev || (memory.score ?? 0) > (prev.score ?? 0)) {
            byId.set(memory.id, memory);
          }
        }
      }
      setSearchHits(
        [...byId.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      );
      setSearchMode(mode);
    },
    []
  );

  useEffect(() => {
    if (!semanticMode) return;
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      void runSemanticSearch(searchQuery, visibleSpace, spaces);
    }, 350);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [semanticMode, searchQuery, visibleSpace, spaces, runSemanticSearch]);

  const counts = useMemo(() => {
    const next: Record<string, number> = { all: memories.length };
    for (const space of spaces) next[space.name] = 0;
    for (const memory of memories) {
      next[memory.containerTag] = (next[memory.containerTag] ?? 0) + 1;
    }
    return next;
  }, [memories, spaces]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = memories.filter((m) => {
      if (visibleSpace !== "all" && m.containerTag !== visibleSpace) return false;
      if (currentFilter === "favorites" && !favorites.has(m.id)) return false;
      if (
        currentFilter === "recent" &&
        nowMs - Date.parse(m.createdAt) > 48 * 60 * 60 * 1000
      ) {
        return false;
      }
      if (
        currentFilter !== "all" &&
        currentFilter !== "favorites" &&
        currentFilter !== "recent" &&
        m.containerTag !== currentFilter
      ) {
        return false;
      }
      if (q && !semanticMode) return m.content.toLowerCase().includes(q);
      return true;
    });

    if (semanticMode && q && searchHits) {
      const allowed = new Set(list.map((m) => m.id));
      list = searchHits.filter((m) => allowed.has(m.id));
    }

    if (!semanticMode) {
      list = [...list].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
    }
    return list;
  }, [
    memories,
    visibleSpace,
    currentFilter,
    favorites,
    searchQuery,
    semanticMode,
    searchHits,
    nowMs,
  ]);

  const detail = memories.find((m) => m.id === detailId) ?? null;
  const related = useMemo(() => {
    if (!detail) {
      return memories
        .filter((m) =>
          visibleSpace === "all" ? true : m.containerTag === visibleSpace
        )
        .slice(1, 3);
    }
    return memories
      .filter((m) => m.id !== detail.id && m.containerTag === detail.containerTag)
      .slice(0, 2);
  }, [detail, memories, visibleSpace]);

  const digest = useMemo(() => {
    const day = 24 * 60 * 60 * 1000;
    const today = memories.filter((m) => nowMs - Date.parse(m.createdAt) < day);
    if (today.length === 0) {
      return "No new memories today. Capture a thought to start today's digest.";
    }
    const tags = [...new Set(today.map((m) => m.containerTag))];
    const preview = today[0]?.content.slice(0, 90) ?? "";
    return `You saved ${today.length} memor${today.length === 1 ? "y" : "ies"} today across ${tags.map(labelize).join(", ")}. ${preview}${today[0] && today[0].content.length > 90 ? "…" : ""}`;
  }, [memories, nowMs]);

  const retrieval = useMemo(() => {
    const scored = (searchHits ?? []).filter((m) => typeof m.score === "number");
    if (scored.length === 0) return "—";
    return `${Math.round(Math.max(...scored.map((m) => m.score ?? 0)) * 100)}%`;
  }, [searchHits]);

  const viewTitle =
    visibleSpace === "all"
      ? "All Memories"
      : `${spaceStyle(visibleSpace).label} Memories`;
  const viewSubtitle =
    visibleSpace === "all"
      ? `${memories.length} memories across all spaces`
      : `${counts[visibleSpace] ?? 0} memories in ${spaceStyle(visibleSpace).label}`;

  const closeOverlays = useCallback(() => {
    setCmdOpen(false);
    setAddOpen(false);
    setDetailId(null);
    setSidebarOpen(false);
    setRightPanelOpen(false);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const setSpace = useCallback((space: string) => {
    setCurrentSpace(space);
    if (space !== "all") setAddSpaceName(space);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  const value: WorkspaceValue = {
    spaces,
    memories,
    loading,
    visibleSpace,
    visibleAddSpace,
    currentFilter,
    semanticMode,
    viewMode,
    searchQuery,
    searchMode,
    favorites,
    theme,
    sidebarOpen,
    rightPanelOpen,
    addOpen,
    cmdOpen,
    detail,
    filtered,
    related,
    counts,
    digest,
    retrieval,
    viewTitle,
    viewSubtitle,
    toast,
    toastOn,
    setCurrentFilter,
    setViewMode,
    setSearchQuery,
    setSidebarOpen,
    setRightPanelOpen,
    setAddOpen,
    setCmdOpen,
    setSpace,
    setAddSpace: setAddSpaceName,
    openDetail: (id: string) => setDetailId(id),
    closeDetail: () => setDetailId(null),
    closeOverlays,
    toggleTheme,
    toggleSemantic: () => {
      if (semanticMode) {
        setSearchHits(null);
        setSearchMode(null);
        setSemanticMode(false);
        return;
      }
      setSemanticMode(true);
    },
    toggleFavorite: (id: string) => {
      const next = new Set(favorites);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setFavorites(next);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
    },
    showToast,
    refresh,
    addMemory: async (content, space) => {
      await createMemory(content, space);
      setAddOpen(false);
      await refresh();
      showToast("Memory saved");
    },
    saveMemory: async (id, content) => {
      const ok = await updateMemory(id, content);
      if (ok) {
        await refresh();
        showToast("Memory updated");
      }
      return ok;
    },
    removeMemory: async (id) => {
      if (!confirm("Delete this memory?")) return;
      if (await deleteMemory(id)) {
        setDetailId(null);
        await refresh();
        showToast("Memory deleted");
      }
    },
    addSpace: async (name) => {
      const result = await createSpace(name);
      if (!result.ok) return result.error;
      await refresh();
      setSpace(result.space.name);
      showToast("Space created");
      return null;
    },
    removeSpace: async () => {
      if (visibleSpace === "all" || visibleSpace === "default") return;
      const current = spaces.find((s) => s.name === visibleSpace);
      const count = current?.memoryCount ?? counts[visibleSpace] ?? 0;
      const message =
        count > 0
          ? `Delete space "${visibleSpace}" and its ${count} memor${count === 1 ? "y" : "ies"}?`
          : `Delete empty space "${visibleSpace}"?`;
      if (!confirm(message)) return;
      const result = await deleteSpace(visibleSpace, count > 0);
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      setCurrentSpace("all");
      await refresh();
      showToast("Space deleted");
    },
    ask: async (question) => {
      const tags =
        visibleSpace === "all" ? spaces.map((s) => s.name) : [visibleSpace];
      const results = await Promise.all(
        tags.map((tag) => askMemories(question, tag))
      );
      const best = [...results].sort(
        (a, b) => (b.citations?.length ?? 0) - (a.citations?.length ?? 0)
      )[0];
      return {
        answer: best?.answer ?? "No answer.",
        citations: best?.citations ?? [],
      };
    },
  };

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}
