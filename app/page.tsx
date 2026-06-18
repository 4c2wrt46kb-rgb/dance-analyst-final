"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Play,
  Pause,
  FlipHorizontal,
  Grid,
  ChevronsLeft,
  ChevronsRight,
  Upload,
  X,
  RotateCw,
  FileText,
  Edit2,
  Folder,
  Clock,
  Settings2,
  RefreshCw,
  Plus,
  ZoomIn,
  Save,
  FolderOpen,
  Download,
  Home,
  Flame,
  Tv,
  ArrowRight,
  Video,
  GitFork,
  CheckSquare,
  Square,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  AlignLeft,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface GoalNode {
  id: string;
  text: string;
  completed: boolean;
  isExpanded?: boolean;
  children: GoalNode[];
}

interface VideoTab {
  id: string;
  name: string;
  videoSrc: string | null;
  isMirrored: boolean;
  rotation: number;
  showGrid: boolean;
  playbackRate: number;
  notes: string;
  category: string;
  loopStart: number | null;
  loopEnd: number | null;
  zoom: number;
  panX: number;
  panY: number;
  videoId?: string;
}

// Compare-side independent controls
interface CompareControls {
  isMirrored: boolean;
  rotation: number;
  showGrid: boolean;
  playbackRate: number;
  zoom: number;
  panX: number;
  panY: number;
  loopStart: number | null;
  loopEnd: number | null;
  // Sync offset: when main is at T, compare plays at T + offset
  syncOffset: number;
}

// ─────────────────────────────────────────────
// IndexedDB helpers
// ─────────────────────────────────────────────

const DB_NAME = "video-analyzer-db";
const STORE_NAME = "videos";

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject("IndexedDB unsupported");
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const getVideoFromDB = async (id: string): Promise<File | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
};

const saveVideoToDB = async (id: string, file: File): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const deleteVideoFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ─────────────────────────────────────────────
// Goal tree node
// ─────────────────────────────────────────────

interface RenderGoalNodeProps {
  node: GoalNode;
  depth: number;
  onToggleExpand: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}

const RenderGoalNode = React.memo(({
  node,
  depth = 0,
  onToggleExpand,
  onToggleComplete,
  onUpdateText,
  onAddChild,
  onDelete,
}: RenderGoalNodeProps) => {
  const isRoot = node.id === "root";
  return (
    <div className="flex flex-col mt-2 select-none w-full">
      <div
        className={`flex items-center gap-2 group p-2 rounded-xl border transition-all ${
          isRoot
            ? "bg-[#191924] border-cyan-500/30 shadow-md shadow-cyan-500/5 py-3"
            : "bg-[#121218]/80 border-zinc-800/60 hover:bg-[#191924]"
        }`}
        style={{ marginLeft: `${depth * 14}px` }}
      >
        {node.children.length > 0 ? (
          <button onClick={() => onToggleExpand(node.id)} className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5">
            {node.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <div className="w-4" />
        )}

        <button onClick={() => onToggleComplete(node.id)} className="text-zinc-400 hover:text-cyan-400 transition-colors">
          {node.completed ? (
            <CheckSquare size={15} className="text-cyan-400 stroke-[2.5]" />
          ) : (
            <Square size={15} className="text-zinc-600 group-hover:text-zinc-400" />
          )}
        </button>

        <input
          type="text"
          value={node.text}
          onChange={(e) => onUpdateText(node.id, e.target.value)}
          placeholder="目標を入力..."
          className={`bg-transparent focus:outline-none flex-1 min-w-0 text-xs md:text-sm transition-all ${
            node.completed ? "text-zinc-600 line-through italic" : "text-zinc-200"
          } ${isRoot ? "font-black text-sm md:text-base text-white" : depth === 1 ? "font-bold text-cyan-300" : "font-medium"}`}
        />

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
          <button
            onClick={() => onAddChild(node.id)}
            title="新しい枝（子目標）を追加"
            className="p-1 text-zinc-400 hover:text-cyan-400 bg-zinc-950/60 border border-zinc-800 rounded-lg hover:border-zinc-700"
          >
            <Plus size={12} className="stroke-[2.5]" />
          </button>
          {!isRoot && (
            <button
              onClick={() => onDelete(node.id)}
              title="この枝を削除"
              className="p-1 text-zinc-500 hover:text-red-400 bg-zinc-950/60 border border-zinc-800 rounded-lg hover:border-zinc-700"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {node.isExpanded && node.children.length > 0 && (
        <div className="relative border-l border-zinc-800/80 ml-[23px] pl-1.5 transition-all">
          {node.children.map((child) => (
            <RenderGoalNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onToggleExpand={onToggleExpand}
              onToggleComplete={onToggleComplete}
              onUpdateText={onUpdateText}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
});
RenderGoalNode.displayName = "RenderGoalNode";

// ─────────────────────────────────────────────
// Default values
// ─────────────────────────────────────────────

const DEFAULT_COMPARE_CONTROLS: CompareControls = {
  isMirrored: false,
  rotation: 0,
  showGrid: false,
  playbackRate: 1,
  zoom: 1,
  panX: 0,
  panY: 0,
  loopStart: null,
  loopEnd: null,
  syncOffset: 0,
};

const makeDefaultTab = (index: number): VideoTab => ({
  id: `tab-${Date.now()}`,
  name: `セッション ${index}`,
  videoSrc: null,
  isMirrored: false,
  rotation: 0,
  showGrid: false,
  playbackRate: 1,
  notes: "",
  category: "その他",
  loopStart: null,
  loopEnd: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  videoId: undefined,
});

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function VideoAnalyzer() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [view, setView] = useState<"home" | "analyzer" | "goals">("home");

  const [goalRoot, setGoalRoot] = useState<GoalNode>({
    id: "root",
    text: "ここに大目標を入力（例：〇〇のバトルで優勝する）",
    completed: false,
    isExpanded: true,
    children: [
      { id: "c-1", text: "スキル（例：フットワークのバリエーション）", completed: false, isExpanded: true, children: [] },
      { id: "c-2", text: "フィジカル（例：体幹・ベンチプレス強化）", completed: false, isExpanded: true, children: [] },
      { id: "c-3", text: "研究・バトル戦術", completed: false, isExpanded: true, children: [] },
    ],
  });

  const [categories, setCategories] = useState<string[]>(["フットワーク", "パワームーブ", "バトル", "ルーティン", "その他"]);

  const [tabs, setTabs] = useState<VideoTab[]>([{ ...makeDefaultTab(1), id: "tab-1" }]);
  const [activeTabId, setActiveTabId] = useState<string>("tab-1");

  // Compare state
  const [compareMode, setCompareMode] = useState(false);
  const [compareTabId, setCompareTabId] = useState<string | null>(null);
  const [syncPlay, setSyncPlay] = useState(true);
  const [compareControls, setCompareControls] = useState<CompareControls>(DEFAULT_COMPARE_CONTROLS);
  const [showComparePanel, setShowComparePanel] = useState(false);
  const [showCompareZoomPanel, setShowCompareZoomPanel] = useState(false);

  // UI state
  const [currentCategory, setCurrentCategory] = useState("すべて");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [compareDuration, setCompareDuration] = useState(0);

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const [isManagingCats, setIsManagingCats] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [showZoomPanel, setShowZoomPanel] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const compareFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const compareVideoRef = useRef<HTMLVideoElement>(null);

  // Keep ref in sync to avoid stale closures in cleanup
  const tabsRef = useRef(tabs);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);

  // ── Derived ──────────────────────────────────
  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) ?? tabs[0], [tabs, activeTabId]);
  const compareTab = useMemo(() => tabs.find((t) => t.id === compareTabId), [tabs, compareTabId]);
  const filteredTabs = useMemo(
    () => tabs.filter((tab) => currentCategory === "すべて" || tab.category === currentCategory),
    [tabs, currentCategory],
  );

  // ─────────────────────────────────────────────
  // Load persisted data on mount
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.style.backgroundColor = "#0b0b0f";
      document.documentElement.style.backgroundColor = "#0b0b0f";
    }

    const savedGoals = localStorage.getItem("video-analyzer-goals");
    if (savedGoals) {
      try { setGoalRoot(JSON.parse(savedGoals)); } catch {}
    }

    const savedCats = localStorage.getItem("video-analyzer-categories");
    if (savedCats) {
      try { setCategories(JSON.parse(savedCats)); } catch {}
    }

    const savedActiveTab = localStorage.getItem("video-analyzer-active-tab");
    if (savedActiveTab) setActiveTabId(savedActiveTab);

    const savedCompare = localStorage.getItem("video-analyzer-compare-controls");
    if (savedCompare) {
      try { setCompareControls(JSON.parse(savedCompare)); } catch {}
    }

    const restoreVideos = async () => {
      try {
        const savedTabs = localStorage.getItem("video-analyzer-tabs");
        let baseTabs: VideoTab[] = savedTabs ? JSON.parse(savedTabs) : [{ ...makeDefaultTab(1), id: "tab-1" }];

        const updatedTabs = await Promise.all(
          baseTabs.map(async (tab) => {
            if (!tab.videoId) return tab;
            const file = await getVideoFromDB(tab.videoId);
            if (!file) return tab;
            return { ...tab, videoSrc: URL.createObjectURL(file) };
          }),
        );
        setTabs(updatedTabs);
      } catch (err) {
        console.error("動画復元失敗", err);
      } finally {
        setIsLoaded(true);
      }
    };
    restoreVideos();

    return () => {
      // Cleanup object URLs on unmount
      tabsRef.current.forEach((tab) => {
        if (tab.videoSrc) URL.revokeObjectURL(tab.videoSrc);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────
  // Persist on change
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("video-analyzer-categories", JSON.stringify(categories));
  }, [categories, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const safeTabs = tabs.map((tab) => ({ ...tab, videoSrc: null }));
    localStorage.setItem("video-analyzer-tabs", JSON.stringify(safeTabs));
  }, [tabs, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("video-analyzer-active-tab", activeTabId);
  }, [activeTabId, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("video-analyzer-goals", JSON.stringify(goalRoot));
  }, [goalRoot, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("video-analyzer-compare-controls", JSON.stringify(compareControls));
  }, [compareControls, isLoaded]);

  // ─────────────────────────────────────────────
  // Playback rate sync
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = activeTab?.playbackRate ?? 1;
  }, [activeTabId, activeTab?.playbackRate, activeTab?.videoSrc, view]);

  useEffect(() => {
    if (compareMode && compareVideoRef.current) {
      compareVideoRef.current.playbackRate = compareControls.playbackRate;
    }
  }, [compareMode, compareControls.playbackRate, compareTabId]);

  useEffect(() => {
    setIsPlaying(false);
  }, [activeTabId, view]);

  // ─────────────────────────────────────────────
  // Goal tree helpers (memoised)
  // ─────────────────────────────────────────────

  const updateTreeRecursively = useCallback(
    (node: GoalNode, targetId: string, updater: (n: GoalNode) => Partial<GoalNode>): GoalNode => {
      if (node.id === targetId) return { ...node, ...updater(node) };
      return { ...node, children: node.children.map((c) => updateTreeRecursively(c, targetId, updater)) };
    },
    [],
  );

  const deleteNodeRecursively = useCallback(
    (node: GoalNode, targetId: string): GoalNode => ({
      ...node,
      children: node.children
        .filter((c) => c.id !== targetId)
        .map((c) => deleteNodeRecursively(c, targetId)),
    }),
    [],
  );

  const handleAddChildGoal = useCallback((parentId: string) => {
    const newChild: GoalNode = { id: `goal-${Date.now()}`, text: "新しい目標・行動", completed: false, isExpanded: true, children: [] };
    setGoalRoot((prev) => updateTreeRecursively(prev, parentId, (n) => ({ children: [...n.children, newChild], isExpanded: true })));
  }, [updateTreeRecursively]);

  const handleUpdateGoalText = useCallback((id: string, text: string) => {
    setGoalRoot((prev) => updateTreeRecursively(prev, id, () => ({ text })));
  }, [updateTreeRecursively]);

  const handleToggleGoalComplete = useCallback((id: string) => {
    setGoalRoot((prev) => updateTreeRecursively(prev, id, (n) => ({ completed: !n.completed })));
  }, [updateTreeRecursively]);

  const handleToggleGoalExpand = useCallback((id: string) => {
    setGoalRoot((prev) => updateTreeRecursively(prev, id, (n) => ({ isExpanded: !n.isExpanded })));
  }, [updateTreeRecursively]);

  const handleDeleteGoal = useCallback((id: string) => {
    if (id === "root") return;
    setGoalRoot((prev) => deleteNodeRecursively(prev, id));
  }, [deleteNodeRecursively]);

  // ─────────────────────────────────────────────
  // Tab helpers
  // ─────────────────────────────────────────────

  const updateActiveTab = useCallback((updates: Partial<VideoTab>) => {
    setTabs((prev) => prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updates } : tab)));
  }, [activeTabId]);

  const updateCC = useCallback((updates: Partial<CompareControls>) => {
    setCompareControls((prev) => ({ ...prev, ...updates }));
  }, []);

  const addNewTab = useCallback((defaultCategory?: string) => {
    const newTab: VideoTab = {
      ...makeDefaultTab(0),
      id: `tab-${Date.now()}`,
      name: `セッション ${tabsRef.current.length + 1}`,
      category: defaultCategory ?? (currentCategory === "すべて" ? (categories[0] ?? "その他") : currentCategory),
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setIsPlaying(false);
    return newTab.id;
  }, [categories, currentCategory]);

  const closeTab = useCallback(async (idToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabsRef.current.length === 1) return;
    const targetTab = tabsRef.current.find((t) => t.id === idToClose);
    try {
      if (targetTab?.videoId) await deleteVideoFromDB(targetTab.videoId);
      if (targetTab?.videoSrc) URL.revokeObjectURL(targetTab.videoSrc);
    } catch {}
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== idToClose);
      if (activeTabId === idToClose) setActiveTabId(filtered[filtered.length - 1].id);
      return filtered;
    });
    setIsPlaying(false);
  }, [activeTabId]);

  const startRename = useCallback((tab: VideoTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditName(tab.name);
    setEditCategory(tab.category ?? "その他");
  }, []);

  const saveRename = useCallback(() => {
    if (editName.trim()) {
      setTabs((prev) => prev.map((t) => t.id === editingTabId ? { ...t, name: editName, category: editCategory } : t));
    }
    setEditingTabId(null);
  }, [editName, editCategory, editingTabId]);

  // ─────────────────────────────────────────────
  // File input handlers
  // ─────────────────────────────────────────────

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, targetTabId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const idToUpdate = targetTabId ?? activeTabId;
      const currentTab = tabsRef.current.find((t) => t.id === idToUpdate);
      if (currentTab?.videoSrc) URL.revokeObjectURL(currentTab.videoSrc);
      const videoId = `video-${Date.now()}`;
      await saveVideoToDB(videoId, file);
      const objectUrl = URL.createObjectURL(file);
      setTabs((prev) => prev.map((tab) => tab.id === idToUpdate
        ? { ...tab, videoSrc: objectUrl, videoId, name: file.name.substring(0, 20) }
        : tab,
      ));
      setIsPlaying(false);
    } catch (err) {
      console.error(err);
    }
    // Reset so same file can be re-selected
    e.target.value = "";
  }, [activeTabId]);

  const handleCompareFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!compareTabId) return;
    await handleFileChange(e, compareTabId);
  }, [compareTabId, handleFileChange]);

  // ─────────────────────────────────────────────
  // Playback controls
  // ─────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (compareMode && syncPlay && compareVideoRef.current) compareVideoRef.current.pause();
    } else {
      videoRef.current.play();
      if (compareMode && syncPlay && compareVideoRef.current) {
        compareVideoRef.current.currentTime = videoRef.current.currentTime + compareControls.syncOffset;
        compareVideoRef.current.play().catch(() => {});
      }
    }
    setIsPlaying((p) => !p);
  }, [isPlaying, compareMode, syncPlay, compareControls.syncOffset]);

  const stepFrame = useCallback((direction: "forward" | "backward", step = 1) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    if (compareVideoRef.current) compareVideoRef.current.pause();
    setIsPlaying(false);
    const delta = ((direction === "forward" ? 1 : -1) * step) / 30;
    const newTime = videoRef.current.currentTime + delta;
    videoRef.current.currentTime = newTime;
    if (compareMode && syncPlay && compareVideoRef.current) {
      compareVideoRef.current.currentTime = newTime + compareControls.syncOffset;
    }
  }, [compareMode, syncPlay, compareControls.syncOffset]);

  const jumpToTime = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    if (compareMode && syncPlay && compareVideoRef.current) {
      compareVideoRef.current.currentTime = seconds + compareControls.syncOffset;
    }
    if (!isPlaying) {
      videoRef.current.play();
      if (compareMode && syncPlay && compareVideoRef.current) {
        compareVideoRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  }, [compareMode, syncPlay, compareControls.syncOffset, isPlaying]);

  // ── Time update handler ───────────────────────
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Main loop
    if (activeTab?.loopStart !== null && activeTab?.loopEnd !== null
        && time >= (activeTab.loopEnd ?? Infinity)) {
      videoRef.current.currentTime = activeTab.loopStart ?? 0;
      if (compareMode && syncPlay && compareVideoRef.current) {
        compareVideoRef.current.currentTime = (activeTab.loopStart ?? 0) + compareControls.syncOffset;
      }
    }
  }, [activeTab, compareMode, syncPlay, compareControls.syncOffset]);

  // Compare-side loop
  const handleCompareTimeUpdate = useCallback(() => {
    if (!compareVideoRef.current) return;
    const time = compareVideoRef.current.currentTime;
    if (compareControls.loopStart !== null && compareControls.loopEnd !== null
        && time >= compareControls.loopEnd) {
      compareVideoRef.current.currentTime = compareControls.loopStart;
    }
  }, [compareControls.loopStart, compareControls.loopEnd]);

  // ─────────────────────────────────────────────
  // Loop helpers
  // ─────────────────────────────────────────────

  const setLoopPoint = useCallback((type: "start" | "end") => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    if (type === "start") {
      updateActiveTab({ loopStart: time });
    } else if (activeTab?.loopStart === null || time > (activeTab?.loopStart ?? 0)) {
      updateActiveTab({ loopEnd: time });
    }
  }, [activeTab, updateActiveTab]);

  const clearLoop = useCallback(() => updateActiveTab({ loopStart: null, loopEnd: null }), [updateActiveTab]);

  const setCompareLoopPoint = useCallback((type: "start" | "end") => {
    if (!compareVideoRef.current) return;
    const time = compareVideoRef.current.currentTime;
    if (type === "start") {
      updateCC({ loopStart: time });
    } else if (compareControls.loopStart === null || time > compareControls.loopStart) {
      updateCC({ loopEnd: time });
    }
  }, [compareControls.loopStart, updateCC]);

  const clearCompareLoop = useCallback(() => updateCC({ loopStart: null, loopEnd: null }), [updateCC]);

  // ─────────────────────────────────────────────
  // Notes helpers
  // ─────────────────────────────────────────────

  const formatTime = useCallback((time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const insertTimestamp = useCallback(() => {
    if (!videoRef.current) return;
    const timeStr = formatTime(videoRef.current.currentTime);
    const hasNewline = activeTab?.notes.endsWith("\n") || activeTab?.notes === "";
    const newNotes = (activeTab?.notes ?? "") + (hasNewline ? "" : "\n") + `${timeStr} `;
    updateActiveTab({ notes: newNotes });
  }, [activeTab, updateActiveTab, formatTime]);

  const renderNotesWithTimestamps = useCallback((text: string) => {
    if (!text) return <span className="text-zinc-600 text-xs">ここにメモを入力するか、「⏱️ タイムスタンプ挿入」を押してください。</span>;
    return text.split("\n").map((line, i) => {
      const regex = /(\d{1,2}):(\d{2})/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) parts.push(line.substring(lastIndex, match.index));
        const totalSecs = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        parts.push(
          <button key={match.index} onClick={() => jumpToTime(totalSecs)}
            className="text-cyan-400 hover:text-cyan-300 font-mono font-bold underline bg-cyan-500/10 px-1 rounded mx-0.5 inline-block">
            {match[0]}
          </button>,
        );
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < line.length) parts.push(line.substring(lastIndex));
      return <div key={i} className="min-h-[1.5rem] break-all">{parts.length > 0 ? parts : line}</div>;
    });
  }, [jumpToTime]);

  // ─────────────────────────────────────────────
  // Category helpers
  // ─────────────────────────────────────────────

  const addCategory = useCallback(() => {
    const trimmed = newCatName.trim();
    if (trimmed && !categories.includes(trimmed) && trimmed !== "すべて") {
      setCategories((prev) => [...prev, trimmed]);
      setNewCatName("");
    }
  }, [newCatName, categories]);

  const deleteCategory = useCallback((catToDelete: string) => {
    if (categories.length <= 1) return;
    setCategories((prev) => prev.filter((c) => c !== catToDelete));
    setTabs((prev) => prev.map((t) => t.category === catToDelete ? { ...t, category: "その他" } : t));
    if (currentCategory === catToDelete) setCurrentCategory("すべて");
  }, [categories, currentCategory]);

  // ─────────────────────────────────────────────
  // Backup / restore
  // ─────────────────────────────────────────────

  const exportBackup = useCallback(() => {
    const data = { categories, tabs: tabs.map((t) => ({ ...t, videoSrc: null })), goals: goalRoot };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dance-analyst-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [categories, tabs, goalRoot]);

  const handleImportBackup = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.categories && data.tabs) {
          setCategories(data.categories);
          if (data.goals) setGoalRoot(data.goals);
          const tabsWithVideos = await Promise.all(
            data.tabs.map(async (tab: VideoTab) => {
              if (!tab.videoId) return { ...tab, videoSrc: null };
              const videoFile = await getVideoFromDB(tab.videoId);
              if (!videoFile) return { ...tab, videoSrc: null };
              return { ...tab, videoSrc: URL.createObjectURL(videoFile) };
            }),
          );
          setTabs(tabsWithVideos);
          if (tabsWithVideos.length > 0) setActiveTabId(tabsWithVideos[0].id);
          alert("練習データを正常に復元しました！");
        }
      } catch {
        alert("バックアップの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const downloadCurrentVideo = useCallback(async () => {
    if (!activeTab?.videoId) return;
    try {
      const file = await getVideoFromDB(activeTab.videoId);
      if (file) {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = activeTab.name.includes(".") ? activeTab.name : `${activeTab.name}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert("ファイルが見つかりません");
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeTab]);

  // ─────────────────────────────────────────────
  // Guard: not loaded yet
  // ─────────────────────────────────────────────

  if (!isLoaded) return <div className="min-h-screen bg-[#0b0b0f]" />;

  // ─────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────

  /** Grid overlay — fixed dashed border classes */
  const GridOverlay = () => (
    <div className="absolute inset-0 pointer-events-none z-10" style={{
      backgroundImage: "linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)",
      backgroundSize: "33.33% 33.33%",
    }} />
  );

  const VideoPlayer = ({
    vRef,
    tab,
    controls,
    isCompare = false,
    onTimeUpdate,
  }: {
    vRef: React.RefObject<HTMLVideoElement | null>;
    tab: VideoTab;
    controls?: CompareControls;
    isCompare?: boolean;
    onTimeUpdate?: () => void;
  }) => {
    const isMirrored = isCompare ? (controls?.isMirrored ?? false) : tab.isMirrored;
    const rotation = isCompare ? (controls?.rotation ?? 0) : tab.rotation;
    const showGrid = isCompare ? (controls?.showGrid ?? false) : tab.showGrid;
    const zoom = isCompare ? (controls?.zoom ?? 1) : tab.zoom;
    const panX = isCompare ? (controls?.panX ?? 0) : tab.panX;
    const panY = isCompare ? (controls?.panY ?? 0) : tab.panY;
    const loopStart = isCompare ? (controls?.loopStart ?? null) : tab.loopStart;
    const loopEnd = isCompare ? (controls?.loopEnd ?? null) : tab.loopEnd;

    return (
      <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
        <div
          className="w-full h-full flex items-center justify-center transition-all duration-150 ease-out"
          style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: "center center" }}
        >
          <div className="w-full h-full flex items-center justify-center" style={{ transform: `rotate(${rotation}deg)` }}>
            <video
              ref={vRef as React.RefObject<HTMLVideoElement>}
              key={tab.id + (isCompare ? "-compare" : "")}
              src={tab.videoSrc ?? ""}
              playsInline
              className={`w-full h-full object-contain ${isMirrored ? "scale-x-[-1]" : ""}`}
              onPlay={() => !isCompare && setIsPlaying(true)}
              onPause={() => !isCompare && setIsPlaying(false)}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={() => {
                if (!isCompare && vRef.current) setDuration(vRef.current.duration);
                if (isCompare && vRef.current) setCompareDuration(vRef.current.duration);
              }}
              onClick={() => {
                if (!isCompare || !syncPlay) togglePlay();
              }}
            />
            {showGrid && <GridOverlay />}
          </div>
        </div>

        {/* Loop badge */}
        {(loopStart !== null || loopEnd !== null) && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-mono text-cyan-400 z-20 flex items-center gap-1.5 border border-cyan-500/30">
            <RefreshCw size={10} className="animate-spin" style={{ animationDuration: "3s" }} />
            <span>LOOP: {loopStart !== null ? formatTime(loopStart) : "--:--"} → {loopEnd !== null ? formatTime(loopEnd) : "--:--"}</span>
          </div>
        )}

        {/* Label */}
        {compareMode && compareTab && (
          <div className={`absolute bottom-2 ${isCompare ? "right-2" : "left-2"} bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-mono text-zinc-400 border border-zinc-800`}>
            {isCompare ? `比較: ${tab.name}` : `メイン: ${tab.name}`}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-zinc-100 flex flex-col items-center justify-start p-2 md:p-6 font-sans select-none">

      {/* ── Navigation ── */}
      <div className="w-full max-w-6xl mb-4 flex items-center justify-between bg-[#121218] border border-zinc-800/50 px-4 py-3 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView("home")}>
          <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-xl text-black shadow-md shadow-cyan-500/20">
            <Tv size={16} className="stroke-[2.5]" />
          </div>
          <span className="font-black text-sm md:text-base tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            DANCE ANALYST
          </span>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          {(["home", "goals", "analyzer"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                view === v
                  ? "bg-[#191924] text-white border-zinc-700 shadow-inner"
                  : "bg-transparent text-zinc-400 border-transparent hover:text-zinc-200"
              }`}
            >
              {v === "home" && <><Home size={13} /><span className="hidden sm:inline">ホーム</span></>}
              {v === "goals" && <><GitFork size={13} className="text-cyan-400 rotate-90" /><span>目標ツリー</span></>}
              {v === "analyzer" && <><Video size={13} /><span>ビデオ解析</span></>}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          🏠 HOME
      ══════════════════════════════════════════ */}
      {view === "home" && (
        <div className="w-full max-w-6xl space-y-6 animate-fadeIn">
          <div className="relative bg-gradient-to-r from-[#121218] to-[#191924] border border-zinc-800/50 rounded-3xl p-6 md:p-8 overflow-hidden shadow-xl">
            <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-x-10 translate-y-10">
              <Tv size={300} />
            </div>
            <div className="max-w-xl space-y-2 relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full">
                <Flame size={10} fill="currentColor" /> Let&apos;s practice
              </div>
              <h1 className="text-xl md:text-3xl font-black tracking-tight text-white">一歩差をつける、ダンス解析。</h1>
              <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                コマ送り、ループ、画角ズーム、2画面シンクロ比較。自分のムーブを限界までディグして、スキルをネクストレベルへ。
              </p>
              <div className="pt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { addNewTab(); setView("analyzer"); }}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-cyan-500/10 transition-all"
                >
                  <Plus size={14} className="stroke-[3]" /> 新しいセッション
                </button>
                <button
                  onClick={() => setView("goals")}
                  className="bg-zinc-900 border border-zinc-800 text-cyan-400 hover:text-cyan-300 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <GitFork size={14} className="rotate-90" /> 目標ツリーを開く
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "総セッション数", value: tabs.length, unit: "動画", color: "text-white" },
              { label: "管理フォルダ", value: categories.length, unit: "個", color: "text-white" },
              { label: "メモがある動画", value: tabs.filter((t) => t.notes.trim()).length, unit: "本", color: "text-cyan-400" },
            ].map((stat) => (
              <div key={stat.label} className={`bg-[#121218] border border-zinc-800/50 p-4 rounded-2xl ${stat.label === "メモがある動画" ? "col-span-2 md:col-span-1" : ""}`}>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                <div className={`text-xl md:text-2xl font-black mt-1 font-mono ${stat.color}`}>
                  {stat.value} <span className="text-xs text-zinc-400 font-sans font-normal">{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Folder shortcuts */}
          <div className="space-y-3">
            <h2 className="text-xs font-black text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
              <Folder size={12} className="text-cyan-400" /> フォルダショートカット
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat}
                  onClick={() => { setCurrentCategory(cat); setView("analyzer"); }}
                  className="bg-[#121218] border border-zinc-800/50 hover:border-zinc-700 p-4 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between group h-28"
                >
                  <div className="bg-[#191924] border border-zinc-800/50 p-2 rounded-xl w-fit text-zinc-400 group-hover:text-cyan-400 group-hover:border-zinc-700 transition-colors">
                    <Folder size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 line-clamp-1">{cat}</h3>
                    <span className="text-[10px] font-mono text-zinc-500">{tabs.filter((t) => t.category === cat).length} セッション</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent sessions */}
          <div className="space-y-3">
            <h2 className="text-xs font-black text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
              <Clock size={12} className="text-emerald-400" /> 最近のセッション
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => { setActiveTabId(tab.id); setView("analyzer"); }}
                  className={`bg-[#121218] border p-4 rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-4 h-32 relative overflow-hidden group ${
                    tab.id === activeTabId ? "border-cyan-500/40 shadow-md shadow-cyan-500/5 bg-[#191924]/40" : "border-zinc-800/50 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-cyan-400 uppercase font-mono tracking-wider">
                        {tab.category}
                      </span>
                      <h3 className="text-xs font-bold text-zinc-100 line-clamp-1 pt-1 group-hover:text-cyan-400 transition-colors">{tab.name}</h3>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-medium flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-lg border border-zinc-900">
                      {tab.videoSrc ? "🎥 動画あり" : "📁 枠のみ"}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 line-clamp-2 italic leading-relaxed">
                    {tab.notes ? tab.notes : "メモはまだありません。"}
                  </p>
                  <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400 flex items-center gap-1 text-[10px] font-bold">
                    <span>解析を開く</span><ArrowRight size={12} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          🌳 GOALS
      ══════════════════════════════════════════ */}
      {view === "goals" && (
        <div className="w-full max-w-4xl bg-[#121218] border border-zinc-800/50 rounded-2xl shadow-2xl p-4 md:p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <GitFork className="text-cyan-400 rotate-90" size={18} />
              <div>
                <h2 className="text-sm md:text-base font-black tracking-wider text-white uppercase">枝分かれ目標マップ</h2>
                <p className="text-[11px] text-zinc-500">大目標から要素を分解し、具体的な練習メニューへ枝を伸ばします。</p>
              </div>
            </div>
            <button onClick={exportBackup} className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white p-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all">
              <Save size={12} className="text-emerald-400" /><span>保存</span>
            </button>
          </div>
          <div className="bg-[#0b0b0f]/60 border border-zinc-800/50 rounded-2xl p-2 md:p-4 min-h-[400px] overflow-x-auto">
            <RenderGoalNode
              node={goalRoot}
              depth={0}
              onToggleExpand={handleToggleGoalExpand}
              onToggleComplete={handleToggleGoalComplete}
              onUpdateText={handleUpdateGoalText}
              onAddChild={handleAddChildGoal}
              onDelete={handleDeleteGoal}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          🎥 ANALYZER
      ══════════════════════════════════════════ */}
      {view === "analyzer" && (
        <div className="w-full max-w-6xl bg-[#121218] border border-zinc-800/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">

          {/* ── Folder bar ── */}
          <div className="bg-[#191924] border-b border-zinc-800/50 p-2 flex flex-col md:flex-row md:items-center gap-2 justify-between">
            <div className="flex items-center gap-1 overflow-x-auto">
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-zinc-800 text-xs whitespace-nowrap">
                <div className="flex items-center gap-1 px-2 text-zinc-400 font-bold border-r border-zinc-800 mr-1">
                  <Folder size={12} className="text-cyan-400" /><span>フォルダ:</span>
                </div>
                <button
                  onClick={() => setCurrentCategory("すべて")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${currentCategory === "すべて" ? "bg-cyan-500 text-black font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
                >すべて</button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCurrentCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${currentCategory === cat ? "bg-cyan-500 text-black font-bold shadow-md" : "text-zinc-400 hover:text-zinc-200"}`}
                  >{cat}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 self-end md:self-auto flex-wrap">
              <button onClick={exportBackup} className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 p-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all">
                <Save size={12} className="text-emerald-400" /><span>保存</span>
              </button>
              <label className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 p-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer">
                <FolderOpen size={12} className="text-sky-400" /><span>復元</span>
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
              <button
                onClick={() => setIsManagingCats(!isManagingCats)}
                className={`p-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${isManagingCats ? "bg-zinc-700 border-zinc-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
              >
                <Settings2 size={12} /><span>フォルダ編集</span>
              </button>
            </div>
          </div>

          {/* ── Category manager ── */}
          {isManagingCats && (
            <div className="bg-[#0b0b0f] border-b border-zinc-800/50 p-3 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text" placeholder="新しいフォルダ名" value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  className="bg-zinc-900 text-xs text-white border border-zinc-800 rounded-xl px-3 py-1.5 focus:outline-none"
                />
                <button onClick={addCategory} className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                  <Plus size={12} className="stroke-[2.5]" />追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-800/40">
                {categories.map((cat) => (
                  <div key={cat} className="flex items-center gap-1 bg-[#121218] border border-zinc-800 px-2.5 py-1 rounded-xl text-xs text-zinc-300">
                    <input
                      type="text" defaultValue={cat}
                      onBlur={(e) => {
                        const newName = e.target.value.trim();
                        if (!newName || newName === cat) { e.target.value = cat; return; }
                        if (categories.includes(newName)) { alert("そのフォルダ名は既に存在します"); e.target.value = cat; return; }
                        setCategories(categories.map((c) => (c === cat ? newName : c)));
                        setTabs(tabs.map((t) => (t.category === cat ? { ...t, category: newName } : t)));
                        if (currentCategory === cat) setCurrentCategory(newName);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      className="bg-transparent font-medium focus:outline-none w-20 md:w-24 text-zinc-200 border-b border-transparent focus:border-cyan-500/50 transition-all"
                    />
                    {categories.length > 1 && (
                      <X size={12} className="text-zinc-500 hover:text-red-400 cursor-pointer ml-1" onClick={() => deleteCategory(cat)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab bar ── */}
          <div className="bg-[#121218] border-b border-zinc-800/50 p-2 md:p-3 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar">
              {filteredTabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 md:py-2 rounded-xl text-xs font-medium cursor-pointer transition-all border shrink-0 ${
                    tab.id === activeTabId ? "bg-[#191924] text-white border-zinc-700 shadow-sm" : "text-zinc-500 hover:text-zinc-300 bg-transparent border-transparent"
                  }`}
                >
                  {editingTabId === tab.id ? (
                    <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800 rounded-xl p-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text" value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveRename()}
                        autoFocus
                        className="bg-[#0b0b0f] text-white border border-zinc-800 rounded px-1.5 py-0.5 w-24 text-xs focus:outline-none"
                      />
                      <select
                        value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                        className="bg-[#0b0b0f] text-cyan-400 border border-zinc-800 rounded px-1 py-0.5 text-[10px] font-bold focus:outline-none cursor-pointer"
                      >
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={saveRename} className="p-1 bg-cyan-500 text-black rounded hover:bg-cyan-400 transition-colors">
                        <Check size={10} className="stroke-[3]" />
                      </button>
                      <button onClick={() => setEditingTabId(null)} className="p-1 bg-zinc-800 text-zinc-400 rounded hover:text-zinc-200 transition-colors">
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={tab.category}
                        onChange={(e) => { const newCat = e.target.value; setTabs((prev) => prev.map((t) => t.id === tab.id ? { ...t, category: newCat } : t)); }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[9px] font-bold px-1.5 py-0.5 bg-zinc-950 rounded text-cyan-400 border border-zinc-800/80 font-mono uppercase focus:outline-none cursor-pointer appearance-none text-center hover:border-cyan-500/40 transition-all"
                      >
                        {categories.map((c) => <option key={c} value={c} className="bg-[#121218] text-zinc-300">{c}</option>)}
                      </select>
                      <span
                        className="flex items-center gap-1"
                        onClick={(e) => { if (tab.id === activeTabId) { e.stopPropagation(); startRename(tab, e); } }}
                      >
                        {tab.name}<Edit2 size={10} className="opacity-40" />
                      </span>
                    </div>
                  )}
                  {tabs.length > 1 && <X size={12} className="hover:bg-zinc-700 p-0.5 rounded-full" onClick={(e) => closeTab(tab.id, e)} />}
                </div>
              ))}
              <button onClick={() => addNewTab()} className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0"><Plus size={12} /></button>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all">
              <Upload size={12} />動画読込
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />
            <input type="file" ref={compareFileInputRef} onChange={handleCompareFileChange} accept="video/*" className="hidden" />
          </div>

          {/* ── Main layout ── */}
          <div className="flex flex-col lg:flex-row border-b border-zinc-800/50">
            <div className="flex-1 bg-black flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800/50">

              {/* Video area */}
              <div className={`relative flex flex-col md:flex-row items-center justify-center p-2 gap-2 bg-black ${compareMode && compareTab ? "" : "aspect-video"}`}>

                {/* Main video */}
                <div className={`relative overflow-hidden flex items-center justify-center bg-black rounded-xl border border-zinc-900/80 w-full ${compareMode && compareTab ? "aspect-video md:w-1/2" : "h-full"}`}>
                  {activeTab?.videoSrc ? (
                    <VideoPlayer vRef={videoRef} tab={activeTab} onTimeUpdate={handleTimeUpdate} />
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-zinc-600 gap-2 cursor-pointer text-xs p-8">
                      <Upload size={28} />動画を選択してください
                    </div>
                  )}
                </div>

                {/* Compare video */}
                {compareMode && compareTab && (
                  <div className="relative overflow-hidden flex items-center justify-center bg-black rounded-xl border border-zinc-800 w-full aspect-video md:w-1/2">
                    {compareTab.videoSrc ? (
                      <VideoPlayer vRef={compareVideoRef} tab={compareTab} controls={compareControls} isCompare onTimeUpdate={handleCompareTimeUpdate} />
                    ) : (
                      <div onClick={() => compareFileInputRef.current?.click()} className="text-zinc-600 text-xs flex flex-col items-center gap-2 p-8 cursor-pointer">
                        <Upload size={20} />比較動画を読込
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Controls */}
              {activeTab?.videoSrc && (
                <div className="p-3 md:p-4 bg-[#121218] space-y-4 border-t border-zinc-800/50">

                  {/* Seek bar */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-400 w-8">{formatTime(currentTime)}</span>
                    <div className="relative flex-1 h-6 flex items-center">
                      <div className="absolute left-0 right-0 h-1 bg-zinc-800 rounded-lg pointer-events-none" />
                      {activeTab.loopStart !== null && activeTab.loopEnd !== null && duration > 0 && (
                        <div className="absolute h-1 bg-cyan-500/40 pointer-events-none" style={{ left: `${(activeTab.loopStart / duration) * 100}%`, width: `${((activeTab.loopEnd - activeTab.loopStart) / duration) * 100}%` }} />
                      )}
                      {activeTab.loopStart !== null && duration > 0 && <div className="absolute h-3 w-0.5 bg-cyan-400 pointer-events-none z-10" style={{ left: `${(activeTab.loopStart / duration) * 100}%` }} />}
                      {activeTab.loopEnd !== null && duration > 0 && <div className="absolute h-3 w-0.5 bg-cyan-400 pointer-pointer-none z-10" style={{ left: `${(activeTab.loopEnd / duration) * 100}%` }} />}
                      <input
                        type="range" min={0} max={duration || 100} step={0.01} value={currentTime}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (videoRef.current) videoRef.current.currentTime = val;
                          if (compareMode && syncPlay && compareVideoRef.current) compareVideoRef.current.currentTime = val + compareControls.syncOffset;
                        }}
                        className="w-full accent-white bg-transparent h-6 appearance-none cursor-pointer relative z-20 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">{formatTime(duration)}</span>
                  </div>

                  {/* Compare toggle */}
                  <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800/80 flex flex-wrap items-center gap-2 text-xs">
                    <button
                      onClick={() => {
                        setCompareMode(!compareMode);
                        if (!compareTabId && tabs.length > 1) {
                          const otherTab = tabs.find((t) => t.id !== activeTabId);
                          if (otherTab) setCompareTabId(otherTab.id);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all border ${compareMode ? "bg-cyan-500 text-black border-cyan-400 shadow-sm" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"}`}
                    >
                      {compareMode ? "⚡ 2画面比較: ON" : "👥 2画面比較モード"}
                    </button>

                    {compareMode && (
                      <>
                        <select
                          value={compareTabId || ""}
                          onChange={(e) => setCompareTabId(e.target.value || null)}
                          className="bg-zinc-900 text-cyan-400 border border-zinc-800 rounded-lg px-2 py-1 font-bold text-[11px] focus:outline-none"
                        >
                          <option value="">比較する動画を選択</option>
                          {tabs.filter((t) => t.id !== activeTabId).map((t) => (
                            <option key={t.id} value={t.id}>[{t.category}] {t.name}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => setSyncPlay(!syncPlay)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${syncPlay ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}
                        >{syncPlay ? "🔗 同期: ON" : "🔓 個別再生"}</button>

                        <button
                          onClick={() => setShowComparePanel(!showComparePanel)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${showComparePanel ? "bg-violet-500/20 text-violet-300 border-violet-500/40" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"}`}
                        >⚙️ 比較側コントロール</button>
                      </>
                    )}
                  </div>

                  {/* ── Compare-side independent controls panel ── */}
                  {compareMode && showComparePanel && compareTab && (
                    <div className="bg-[#0b0b0f]/80 border border-violet-500/20 rounded-2xl p-3 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-violet-300 uppercase tracking-wider">比較側：独立コントロール</span>
                        <button
                          onClick={() => setCompareControls(DEFAULT_COMPARE_CONTROLS)}
                          className="text-[9px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded font-bold hover:text-zinc-200"
                        >全リセット</button>
                      </div>

                      {/* Quick toggles */}
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <button onClick={() => updateCC({ isMirrored: !compareControls.isMirrored })} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 border transition-all ${compareControls.isMirrored ? "bg-zinc-800 text-white border-zinc-700" : "bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300"}`}>
                          <FlipHorizontal size={12} />ミラー
                        </button>
                        <button onClick={() => updateCC({ rotation: (compareControls.rotation + 90) % 360 })} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 border transition-all ${compareControls.rotation !== 0 ? "bg-zinc-800 text-cyan-400 border-zinc-700" : "bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300"}`}>
                          <RotateCw size={12} />{compareControls.rotation}°
                        </button>
                        <button onClick={() => updateCC({ showGrid: !compareControls.showGrid })} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 border transition-all ${compareControls.showGrid ? "bg-zinc-800 text-white border-zinc-700" : "bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300"}`}>
                          <Grid size={12} />グリッド
                        </button>
                        <button onClick={() => setShowCompareZoomPanel(!showCompareZoomPanel)} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 border font-bold transition-all ${showCompareZoomPanel ? "bg-cyan-500 text-black border-cyan-400" : "bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300"}`}>
                          <ZoomIn size={12} />ズーム
                        </button>
                        {compareTab.videoSrc && (
                          <button onClick={() => compareFileInputRef.current?.click()} className="px-2.5 py-1 rounded-lg flex items-center gap-1 border bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300 transition-all">
                            <Upload size={12} />差替え
                          </button>
                        )}
                      </div>

                      {/* Compare speed */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-zinc-500 tracking-wider whitespace-nowrap">比較SPEED: {compareControls.playbackRate.toFixed(2)}x</span>
                        <input
                          type="range" min={0.25} max={2.0} step={0.05} value={compareControls.playbackRate}
                          onChange={(e) => updateCC({ playbackRate: parseFloat(e.target.value) })}
                          className="flex-1 accent-violet-400 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Sync offset */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-zinc-500 tracking-wider whitespace-nowrap">
                          タイミングずらし: {compareControls.syncOffset > 0 ? "+" : ""}{compareControls.syncOffset.toFixed(1)}s
                        </span>
                        <input
                          type="range" min={-10} max={10} step={0.1} value={compareControls.syncOffset}
                          onChange={(e) => updateCC({ syncOffset: parseFloat(e.target.value) })}
                          className="flex-1 accent-orange-400 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
                        />
                        {compareControls.syncOffset !== 0 && (
                          <button onClick={() => updateCC({ syncOffset: 0 })} className="text-[9px] text-zinc-400 hover:text-white px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-bold">リセット</button>
                        )}
                      </div>

                      {/* Compare zoom panel */}
                      {showCompareZoomPanel && (
                        <div className="bg-black/40 p-2.5 rounded-xl border border-zinc-900 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1"><ZoomIn size={12} /> 比較ズーム: {compareControls.zoom.toFixed(1)}x</span>
                            {(compareControls.zoom !== 1 || compareControls.panX !== 0 || compareControls.panY !== 0) && (
                              <button onClick={() => updateCC({ zoom: 1, panX: 0, panY: 0 })} className="text-[9px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded font-bold">リセット</button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                              { label: "拡大率", min: 1, max: 3, step: 0.1, value: compareControls.zoom, key: "zoom" as const, disabled: false, accent: "accent-cyan-400" },
                              { label: "左右移動", min: -300, max: 300, step: 1, value: compareControls.panX, key: "panX" as const, disabled: compareControls.zoom === 1, accent: "accent-white" },
                              { label: "上下移動", min: -300, max: 300, step: 1, value: compareControls.panY, key: "panY" as const, disabled: compareControls.zoom === 1, accent: "accent-white" },
                            ].map(({ label, min, max, step, value, key, disabled, accent }) => (
                              <div key={key} className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800/80">
                                <span className="text-[9px] text-zinc-400 w-12 font-medium pl-1">{label}</span>
                                <input
                                  type="range" min={min} max={max} step={step} value={value} disabled={disabled}
                                  onChange={(e) => updateCC({ [key]: parseFloat(e.target.value) } as Partial<CompareControls>)}
                                  className={`flex-1 h-1 rounded-lg appearance-none cursor-pointer ${disabled ? "accent-zinc-600 bg-zinc-900 cursor-not-allowed" : `${accent} bg-zinc-800`}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Compare seek bar */}
                      {compareTab.videoSrc && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-zinc-500">比較側シーク</span>
                          <input
                            type="range" min={0} max={compareDuration || 100} step={0.01}
                            defaultValue={0}
                            onChange={(e) => { if (compareVideoRef.current) compareVideoRef.current.currentTime = parseFloat(e.target.value); }}
                            className="w-full accent-violet-400 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Compare loop */}
                      <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-zinc-800 text-[10px] font-bold self-start">
                        <button onClick={() => setCompareLoopPoint("start")} className={`px-2 py-1 rounded-lg ${compareControls.loopStart !== null ? "bg-violet-500/20 text-violet-300" : "text-zinc-500 hover:text-zinc-300"}`}>[A] 比較開始</button>
                        <button onClick={() => setCompareLoopPoint("end")} className={`px-2 py-1 rounded-lg ${compareControls.loopEnd !== null ? "bg-violet-500/20 text-violet-300" : "text-zinc-500 hover:text-zinc-300"}`}>[B] 比較終了</button>
                        {(compareControls.loopStart !== null || compareControls.loopEnd !== null) && (
                          <button onClick={clearCompareLoop} className="px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10">解除</button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Main playback controls ── */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => stepFrame("backward")} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"><ChevronsLeft size={14} /></button>
                      <button onClick={togglePlay} className="p-2.5 rounded-lg bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/10 hover:bg-cyan-400 transition-all">
                        {isPlaying ? <Pause size={14} fill="black" /> : <Play size={14} fill="black" />}
                      </button>
                      <button onClick={() => stepFrame("forward")} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"><ChevronsRight size={14} /></button>
                    </div>

                    {/* Main loop */}
                    <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-zinc-800 text-[10px] font-bold">
                      <button onClick={() => setLoopPoint("start")} className={`px-2 py-1 rounded-lg ${activeTab.loopStart !== null ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}>[A点] 開始</button>
                      <button onClick={() => setLoopPoint("end")} className={`px-2 py-1 rounded-lg ${activeTab.loopEnd !== null ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}>[B点] 終了</button>
                      {(activeTab.loopStart !== null || activeTab.loopEnd !== null) && (
                        <button onClick={clearLoop} className="px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10">解除</button>
                      )}
                    </div>

                    {/* Toggles */}
                    <div className="flex flex-wrap items-center bg-zinc-900 p-0.5 rounded-xl border border-zinc-800 text-[11px]">
                      <button onClick={() => updateActiveTab({ isMirrored: !activeTab.isMirrored })} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${activeTab.isMirrored ? "bg-zinc-800 text-white" : "text-zinc-500"}`}><FlipHorizontal size={12} />ミラー</button>
                      <button onClick={() => updateActiveTab({ rotation: (activeTab.rotation + 90) % 360 })} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${activeTab.rotation !== 0 ? "bg-zinc-800 text-cyan-400" : "text-zinc-500"}`}><RotateCw size={12} />{activeTab.rotation}°</button>
                      <button onClick={() => updateActiveTab({ showGrid: !activeTab.showGrid })} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${activeTab.showGrid ? "bg-zinc-800 text-white" : "text-zinc-500"}`}><Grid size={12} />グリッド</button>
                      <button onClick={() => setShowZoomPanel(!showZoomPanel)} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold ${showZoomPanel ? "bg-cyan-500 text-black shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}><ZoomIn size={12} />ズーム</button>
                      <button onClick={downloadCurrentVideo} className="px-2.5 py-1 rounded-lg flex items-center gap-1 text-zinc-400 hover:text-zinc-200"><Download size={12} />保存</button>
                    </div>
                  </div>

                  {/* Main speed */}
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[10px] font-bold text-zinc-500 tracking-wider whitespace-nowrap">SPEED: {activeTab.playbackRate.toFixed(2)}x</span>
                    <input
                      type="range" min={0.25} max={2.0} step={0.05} value={activeTab.playbackRate}
                      onChange={(e) => updateActiveTab({ playbackRate: parseFloat(e.target.value) })}
                      className="flex-1 accent-cyan-400 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Main zoom panel */}
                  {showZoomPanel && (
                    <div className="pt-3 border-t border-zinc-800/60 space-y-2 bg-black/40 p-2.5 rounded-xl border border-zinc-900 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-cyan-400 tracking-wider flex items-center gap-1"><ZoomIn size={12} /> 画角ズーム: {activeTab.zoom.toFixed(1)}x</span>
                        {(activeTab.zoom !== 1 || activeTab.panX !== 0 || activeTab.panY !== 0) && (
                          <button onClick={() => updateActiveTab({ zoom: 1, panX: 0, panY: 0 })} className="text-[9px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded font-bold">位置リセット</button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { label: "拡大率", min: 1, max: 3, step: 0.1, value: activeTab.zoom, key: "zoom" as keyof VideoTab, disabled: false, accent: "accent-cyan-400" },
                          { label: "左右移動", min: -300, max: 300, step: 1, value: activeTab.panX, key: "panX" as keyof VideoTab, disabled: activeTab.zoom === 1, accent: "accent-white" },
                          { label: "上下移動", min: -300, max: 300, step: 1, value: activeTab.panY, key: "panY" as keyof VideoTab, disabled: activeTab.zoom === 1, accent: "accent-white" },
                        ].map(({ label, min, max, step, value, key, disabled, accent }) => (
                          <div key={key} className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800/80">
                            <span className="text-[9px] text-zinc-400 w-12 font-medium pl-1">{label}</span>
                            <input
                              type="range" min={min} max={max} step={step} value={value as number} disabled={disabled}
                              onChange={(e) => updateActiveTab({ [key]: parseFloat(e.target.value) })}
                              className={`flex-1 h-1 rounded-lg appearance-none cursor-pointer ${disabled ? "accent-zinc-600 bg-zinc-900 cursor-not-allowed" : `${accent} bg-zinc-800`}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Notes panel ── */}
            <div className="w-full lg:w-[360px] xl:w-[400px] bg-[#121218] flex flex-col p-4 space-y-3 min-h-[300px] lg:min-h-0">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2 gap-2">
                <div className="flex items-center gap-2 text-zinc-400"><FileText size={14} /><h2 className="text-xs font-bold tracking-wider uppercase">練習ノート</h2></div>
                {activeTab?.videoSrc && (
                  <button onClick={insertTimestamp} className="flex items-center gap-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] px-2.5 py-1 rounded-xl transition-all font-bold shadow-sm">
                    <Clock size={12} /><span>タイムスタンプ挿入</span>
                  </button>
                )}
              </div>
              <textarea
                value={activeTab?.notes ?? ""}
                onChange={(e) => updateActiveTab({ notes: e.target.value })}
                placeholder={"例:\n1:02 ここ足のキャッチが遅い\n0:45 軸をまっすぐにする意識！"}
                className="w-full h-24 lg:h-32 bg-[#0b0b0f] border border-zinc-800/50 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none font-sans leading-relaxed"
              />
              <div className="flex-1 bg-[#0b0b0f]/50 border border-zinc-800/50 rounded-xl p-3 overflow-y-auto text-xs text-zinc-300 font-sans leading-loose max-h-[200px] lg:max-h-none">
                {renderNotesWithTimestamps(activeTab?.notes ?? "")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}