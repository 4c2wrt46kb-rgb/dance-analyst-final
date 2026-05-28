"use client";

import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";

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
}

const DB_NAME = "video-analyzer-db";
const STORE_NAME = "videos";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveVideoToDB = async (id: string, file: File) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getVideoFromDB = async (id: string): Promise<File | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const deleteVideoFromDB = async (id: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export default function VideoAnalyzer() {
  const [categories, setCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const savedCats = localStorage.getItem("video-analyzer-categories");
      if (savedCats) return JSON.parse(savedCats);
    }
    return ["フットワーク", "パワームーブ", "バトル", "ルーティン", "その他"];
  });

  const [tabs, setTabs] = useState<VideoTab[]>(() => {
    if (typeof window !== "undefined") {
      const savedTabs = localStorage.getItem("video-analyzer-tabs");
      if (savedTabs) {
        const parsedTabs: VideoTab[] = JSON.parse(savedTabs);
        return parsedTabs.map((tab) => ({
          ...tab,
          videoSrc: null,
          category: tab.category || "その他",
          loopStart: tab.loopStart !== undefined ? tab.loopStart : null,
          loopEnd: tab.loopEnd !== undefined ? tab.loopEnd : null,
          zoom: tab.zoom !== undefined ? tab.zoom : 1,
          panX: tab.panX !== undefined ? tab.panX : 0,
          panY: tab.panY !== undefined ? tab.panY : 0,
        }));
      }
    }
    return [
      {
        id: "tab-1",
        name: "セッション 1",
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
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("video-analyzer-active-tab") || "tab-1";
    }
    return "tab-1";
  });

  const [currentCategory, setCurrentCategory] = useState("すべて");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isManagingCats, setIsManagingCats] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [showZoomPanel, setShowZoomPanel] = useState(false); // ズームパネル開閉状態

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const filteredTabs = tabs.filter(
    (tab) => currentCategory === "すべて" || tab.category === currentCategory
  );

  useEffect(() => {
    localStorage.setItem("video-analyzer-categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    const safeTabs = tabs.map((tab) => ({ ...tab, videoSrc: null }));
    localStorage.setItem("video-analyzer-tabs", JSON.stringify(safeTabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem("video-analyzer-active-tab", activeTabId);
  }, [activeTabId]);

  useEffect(() => {
    const restoreVideos = async () => {
      try {
        const updatedTabs = await Promise.all(
          tabs.map(async (tab) => {
            const file = await getVideoFromDB(tab.id);
            if (!file) return tab;
            return { ...tab, videoSrc: URL.createObjectURL(file) };
          })
        );
        setTabs(updatedTabs);
      } catch (err) {
        console.error("動画の復元に失敗しました:", err);
      }
    };
    restoreVideos();
  }, []);

  const updateActiveTab = (updates: Partial<VideoTab>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updates } : tab))
    );
  };

  useEffect(() => {
    setIsPlaying(false);
  }, [activeTabId]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = activeTab.playbackRate;
    }
  }, [activeTabId, activeTab.playbackRate, activeTab.videoSrc]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    if (activeTab.loopStart !== null && activeTab.loopEnd !== null) {
      if (time >= activeTab.loopEnd) {
        videoRef.current.currentTime = activeTab.loopStart;
      }
    }
  };

  const addCategory = () => {
    const trimmed = newCatName.trim();
    if (trimmed && !categories.includes(trimmed) && trimmed !== "すべて") {
      setCategories([...categories, trimmed]);
      setNewCatName("");
    }
  };

  const deleteCategory = (catToDelete: string) => {
    if (categories.length <= 1) return;
    setCategories(categories.filter((c) => c !== catToDelete));
    setTabs((prev) =>
      prev.map((t) => (t.category === catToDelete ? { ...t, category: "その他" } : t))
    );
    if (currentCategory === catToDelete) {
      setCurrentCategory("すべて");
    }
  };

  const setLoopPoint = (type: "start" | "end") => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    if (type === "start") {
      updateActiveTab({ loopStart: time });
    } else {
      if (activeTab.loopStart === null || time > activeTab.loopStart) {
        updateActiveTab({ loopEnd: time });
      }
    }
  };

  const clearLoop = () => {
    updateActiveTab({ loopStart: null, loopEnd: null });
  };

  const insertTimestamp = () => {
    if (!videoRef.current) return;
    const timeStr = formatTime(videoRef.current.currentTime);
    const hasNewline = activeTab.notes.endsWith("\n") || activeTab.notes === "";
    const newNotes = activeTab.notes + (hasNewline ? "" : "\n") + `${timeStr} `;
    updateActiveTab({ notes: newNotes });
  };

  const addNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: VideoTab = {
      id: newId,
      name: `セッション ${tabs.length + 1}`,
      videoSrc: null,
      isMirrored: false,
      rotation: 0,
      showGrid: false,
      playbackRate: 1,
      notes: "",
      category: currentCategory === "すべて" ? (categories[0] || "その他") : currentCategory,
      loopStart: null,
      loopEnd: null,
      zoom: 1,
      panX: 0,
      panY: 0,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setIsPlaying(false);
  };

  const closeTab = async (idToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const filtered = tabs.filter((tab) => tab.id !== idToClose);
    setTabs(filtered);
    if (activeTabId === idToClose) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
    setIsPlaying(false);
    try {
      await deleteVideoFromDB(idToClose);
    } catch (err) {
      console.error(err);
    }
  };

  const startRename = (tab: VideoTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditName(tab.name);
  };

  const saveRename = () => {
    if (editName.trim()) {
      setTabs((prev) =>
        prev.map((t) => (t.id === editingTabId ? { ...t, name: editName } : t))
      );
    }
    setEditingTabId(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateActiveTab({ videoSrc: url, name: file.name.substring(0, 10) });
      setIsPlaying(false);
      try {
        await saveVideoToDB(activeTabId, file);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const stepFrame = (direction: "forward" | "backward") => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime += direction === "forward" ? 1 / 30 : -1 / 30;
  };

  const jumpToTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // 【A案】バックアップ書き出し機能
  const exportBackup = () => {
    const data = {
      categories,
      tabs: tabs.map((t) => ({ ...t, videoSrc: null })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dance-analyst-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 【A案】バックアップ復元機能
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.categories && data.tabs) {
          setCategories(data.categories);

          // 復元したタブに対してIndexedDB内に動画があれば即座に紐付け直す
          const tabsWithVideos = await Promise.all(
            data.tabs.map(async (tab: any) => {
              const videoFile = await getVideoFromDB(tab.id);
              if (!videoFile) return { ...tab, videoSrc: null };
              return { ...tab, videoSrc: URL.createObjectURL(videoFile) };
            })
          );

          setTabs(tabsWithVideos);
          if (tabsWithVideos.length > 0) {
            setActiveTabId(tabsWithVideos[0].id);
          }
          alert("練習データを正常に復元しました！");
        }
      } catch (err) {
        alert("バックアップファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
  };

  // 【新設】現在読み込んでいる動画ファイルをそのままデバイスにダウンロードする機能
  const downloadCurrentVideo = async () => {
    if (!activeTab.id || !activeTab.videoSrc) return;
    try {
      const file = await getVideoFromDB(activeTab.id);
      if (file) {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = activeTab.name.includes(".") ? activeTab.name : `${activeTab.name}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert("動画ファイルがブラウザに見つかりません。");
      }
    } catch (err) {
      console.error("動画の保存に失敗しました:", err);
    }
  };

  const renderNotesWithTimestamps = (text: string) => {
    if (!text) return <span className="text-zinc-600 text-xs">ここにメモを入力するか、「⏱️ タイムスタンプ挿入」を押してください。</span>;
    return text.split("\n").map((line, i) => {
      const timestampRegex = /(\d{1,2}):(\d{2})/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      while ((match = timestampRegex.exec(line)) !== null) {
        const matchIndex = match.index;
        if (matchIndex > lastIndex) { parts.push(line.substring(lastIndex, matchIndex)); }
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const totalSeconds = mins * 60 + secs;
        parts.push(
          <button key={matchIndex} onClick={() => jumpToTime(totalSeconds)} className="text-amber-400 hover:text-amber-300 font-mono font-bold underline bg-amber-500/10 px-1 rounded mx-0.5 inline-block">
            {match[0]}
          </button>
        );
        lastIndex = timestampRegex.lastIndex;
      }
      if (lastIndex < line.length) { parts.push(line.substring(lastIndex)); }
      return <div key={i} className="min-h-[1.5rem] break-all">{parts.length > 0 ? parts : line}</div>;
    });
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen text-zinc-100 flex flex-col items-center justify-start p-2 md:p-6 font-sans select-none">
      <div className="w-full max-w-6xl bg-[#121215] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* フォルダバー */}
        <div className="bg-[#1a1a22] border-b border-zinc-800 p-2 flex flex-col md:flex-row md:items-center gap-2 justify-between">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-zinc-800 text-xs whitespace-nowrap">
              <div className="flex items-center gap-1 px-2 text-zinc-400 font-bold border-r border-zinc-800 mr-1">
                <Folder size={12} className="text-amber-400" />
                <span>フォルダ:</span>
              </div>
              <button onClick={() => setCurrentCategory("すべて")} className={`px-3 py-1 rounded-lg font-medium transition-all ${currentCategory === "すべて" ? "bg-amber-500 text-black font-bold" : "text-zinc-400 hover:text-zinc-200"}`}>すべて</button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCurrentCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    currentCategory === cat ? "bg-amber-500 text-black font-bold shadow-md" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 右側アクション群（A案 バックアップ機能追加） */}
          <div className="flex items-center gap-1.5 self-end md:self-auto flex-wrap">
            <button
              onClick={exportBackup}
              className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 p-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
              title="ノートや設定をファイルにエクスポート"
            >
              <Save size={12} className="text-emerald-400" />
              <span>データ保存</span>
            </button>
            <label
              className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 p-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              title="バックアップファイルを読み込んで復元"
            >
              <FolderOpen size={12} className="text-sky-400" />
              <span>データ復元</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
            <button
              onClick={() => setIsManagingCats(!isManagingCats)}
              className={`p-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                isManagingCats ? "bg-zinc-700 border-zinc-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Settings2 size={12} />
              <span>フォルダ編集</span>
            </button>
          </div>
        </div>

        {/* フォルダ管理パネル */}
        {isManagingCats && (
          <div className="bg-[#15151a] border-b border-zinc-800 p-3 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="新しいフォルダ名"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                className="bg-zinc-900 text-xs text-white border border-zinc-800 rounded-xl px-3 py-1.5 focus:outline-none"
              />
              <button onClick={addCategory} className="bg-zinc-200 text-black text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1"><Plus size={12} />追加</button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-800/40">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-xl text-xs text-zinc-300">
                  <input
                    type="text"
                    value={cat}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setCategories(categories.map((c) => (c === cat ? newName : c)));
                      setTabs(tabs.map((t) => (t.category === cat ? { ...t, category: newName } : t)));
                    }}
                    className="bg-transparent font-medium focus:outline-none w-20 md:w-24 text-zinc-200"
                  />
                  {categories.length > 1 && (
                    <X size={12} className="text-zinc-500 hover:text-red-400 cursor-pointer ml-1" onClick={() => deleteCategory(cat)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* タブバー */}
        <div className="bg-[#16161A] border-b border-zinc-800 p-2 md:p-3 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar">
            {filteredTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 md:py-2 rounded-xl text-xs font-medium cursor-pointer transition-all border shrink-0 ${
                  tab.id === activeTabId ? "bg-zinc-800 text-white border-zinc-700 shadow-sm" : "text-zinc-500 hover:text-zinc-300 bg-transparent border-transparent"
                }`}
              >
                {editingTabId === tab.id ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={saveRename}
                      onKeyDown={(e) => e.key === "Enter" && saveRename()}
                      autoFocus
                      className="bg-zinc-900 text-white border border-zinc-700 rounded px-1.5 py-0.5 w-20 text-xs focus:outline-none"
                    />
                    <select
                      value={tab.category}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setTabs((prev) => prev.map((t) => (t.id === tab.id ? { ...t, category: newCat } : t)));
                      }}
                      className="bg-zinc-950 text-amber-400 border border-zinc-800 rounded px-1 py-0.5 text-[10px] font-bold focus:outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5" onDoubleClick={(e) => startRename(tab, e)} onClick={(e) => tab.id === activeTabId && startRename(tab, e)}>
                    <span className="text-[9px] font-bold px-1 py-0.2 bg-zinc-950 rounded text-amber-400 border border-zinc-800/80 font-mono uppercase">{tab.category}</span>
                    {tab.name}
                    <Edit2 size={10} className="opacity-40" />
                  </span>
                )}
                {tabs.length > 1 && (
                  <X size={12} className="hover:bg-zinc-700 p-0.5 rounded-full" onClick={(e) => closeTab(tab.id, e)} />
                )}
              </div>
            ))}
            <button onClick={addNewTab} className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0"><Plus size={12} /></button>
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 bg-zinc-200 text-black text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap"><Upload size={12} />動画読込</button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />
        </div>

        {/* メインコンテンツ */}
        <div className="flex flex-col lg:flex-row border-b border-zinc-800">
          <div className="flex-1 bg-black flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800">
            
            {/* ビデオプレイヤー外枠コンテナ */}
            <div className="relative aspect-video flex items-center justify-center p-2 overflow-hidden bg-[#050506]">
              {activeTab.videoSrc ? (
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                  
                  {/* ズーム＆位置調整用レイヤー */}
                  <div 
                    className="w-full h-full flex items-center justify-center transition-all duration-150 ease-out" 
                    style={{ 
                      transform: `translate(${activeTab.panX}px, ${activeTab.panY}px) scale(${activeTab.zoom})`,
                      transformOrigin: "center center"
                    }}
                  >
                    {/* 回転用レイヤー */}
                    <div 
                      className="w-full h-full flex items-center justify-center" 
                      style={{ transform: `rotate(${activeTab.rotation}deg)` }}
                    >
                      <video
                        ref={videoRef}
                        key={activeTab.id}
                        src={activeTab.videoSrc || ""}
                        playsInline
                        className={`w-full h-full object-contain ${activeTab.isMirrored ? "scale-x-[-1]" : ""}`}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
                        onClick={togglePlay}
                      />
                      {activeTab.showGrid && (
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-10">
                          <div className="border-r border-b border-dashed border-white/50"></div>
                          <div className="border-r border-b border-dashed border-white/50"></div>
                          <div className="border-b border-dashed border-white/50"></div>
                          <div className="border-r border-b border-dashed border-white/50"></div>
                          <div className="border-r border-b border-dashed border-white/50"></div>
                          <div className="border-b border-dashed border-white/50"></div>
                          <div className="border-r border-dashed border-white/50"></div>
                          <div className="border-r border-dashed border-white/50"></div>
                          <div></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ループ表示バッジ */}
                  {(activeTab.loopStart !== null || activeTab.loopEnd !== null) && (
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-mono text-amber-400 z-20 flex items-center gap-1.5 border border-amber-500/30">
                      <RefreshCw size={10} className="animate-spin" style={{ animationDuration: "3s" }} />
                      <span>LOOP: {activeTab.loopStart !== null ? formatTime(activeTab.loopStart) : "--:--"} → {activeTab.loopEnd !== null ? formatTime(activeTab.loopEnd) : "--:--"}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-zinc-600 gap-2 cursor-pointer text-xs"><Upload size={28} />動画を選択してください</div>
              )}
            </div>

            {/* コントローラー */}
            {activeTab.videoSrc && (
              <div className="p-3 md:p-4 bg-[#121215] space-y-4 border-t border-zinc-800/80">
                
                {/* 可視化ループ線付きカスタムシークバー */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-400 w-8">{formatTime(currentTime)}</span>
                  
                  <div className="relative flex-1 h-6 flex items-center">
                    <div className="absolute left-0 right-0 h-1 bg-zinc-800 rounded-lg pointer-events-none"></div>
                    
                    {activeTab.loopStart !== null && activeTab.loopEnd !== null && duration > 0 && (
                      <div 
                        className="absolute h-1 bg-amber-500/40 pointer-events-none"
                        style={{ 
                          left: `${(activeTab.loopStart / duration) * 100}%`,
                          width: `${((activeTab.loopEnd - activeTab.loopStart) / duration) * 100}%` 
                        }}
                      />
                    )}
                    
                    {activeTab.loopStart !== null && duration > 0 && (
                      <div className="absolute h-3 w-0.5 bg-amber-400 pointer-events-none z-10" style={{ left: `${(activeTab.loopStart / duration) * 100}%` }} />
                    )}
                    
                    {activeTab.loopEnd !== null && duration > 0 && (
                      <div className="absolute h-3 w-0.5 bg-amber-400 pointer-events-none z-10" style={{ left: `${(activeTab.loopEnd / duration) * 100}%` }} />
                    )}
                    
                    <input 
                      type="range" 
                      min={0} 
                      max={duration || 100} 
                      step={0.01} 
                      value={currentTime} 
                      onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = parseFloat(e.target.value); }} 
                      className="w-full accent-white bg-transparent h-6 appearance-none cursor-pointer relative z-20 focus:outline-none" 
                    />
                  </div>

                  <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">{formatTime(duration)}</span>
                </div>

                {/* 操作系ボタン行 */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => stepFrame("backward")} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"><ChevronsLeft size={14} /></button>
                    <button onClick={togglePlay} className="p-2.5 rounded-lg bg-white text-black font-bold shadow-md">{isPlaying ? <Pause size={14} fill="black" /> : <Play size={14} fill="black" />}</button>
                    <button onClick={() => stepFrame("forward")} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"><ChevronsRight size={14} /></button>
                  </div>

                  <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-zinc-800 text-[10px] font-bold">
                    <button onClick={() => setLoopPoint("start")} className={`px-2 py-1 rounded-lg ${activeTab.loopStart !== null ? "bg-amber-500/20 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}>[A点] 開始</button>
                    <button onClick={() => setLoopPoint("end")} className={`px-2 py-1 rounded-lg ${activeTab.loopEnd !== null ? "bg-amber-500/20 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}>[B点] 終了</button>
                    {(activeTab.loopStart !== null || activeTab.loopEnd !== null) && (
                      <button onClick={clearLoop} className="px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10">解除</button>
                    )}
                  </div>

                  {/* 強化されたコントロール行（ズーム・動画保存ボタンの追加） */}
                  <div className="flex flex-wrap items-center bg-zinc-900 p-0.5 rounded-xl border border-zinc-800 text-[11px]">
                    <button onClick={() => updateActiveTab({ isMirrored: !activeTab.isMirrored })} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${activeTab.isMirrored ? "bg-zinc-800 text-white" : "text-zinc-500"}`}><FlipHorizontal size={12} />ミラー</button>
                    <button onClick={() => updateActiveTab({ rotation: (activeTab.rotation + 90) % 360 })} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${activeTab.rotation !== 0 ? "bg-zinc-800 text-amber-400" : "text-zinc-500"}`}><RotateCw size={12} />{activeTab.rotation}°</button>
                    <button onClick={() => updateActiveTab({ showGrid: !activeTab.showGrid })} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${activeTab.showGrid ? "bg-zinc-800 text-white" : "text-zinc-500"}`}><Grid size={12} />グリッド</button>
                    <button onClick={() => setShowZoomPanel(!showZoomPanel)} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold ${showZoomPanel ? "bg-amber-500 text-black shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}><ZoomIn size={12} />ズーム</button>
                    <button onClick={downloadCurrentVideo} className="px-2.5 py-1 rounded-lg flex items-center gap-1 text-zinc-400 hover:text-zinc-200" title="動画をカメラロールや本体に保存"><Download size={12} />保存</button>
                  </div>
                </div>

                {/* 再生速度スライダー */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] font-bold text-zinc-500 tracking-wider whitespace-nowrap">SPEED: {activeTab.playbackRate.toFixed(2)}x</span>
                  <input type="range" min={0.25} max={2.0} step={0.05} value={activeTab.playbackRate} onChange={(e) => updateActiveTab({ playbackRate: parseFloat(e.target.value) })} className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer" />
                </div>

                {/* 【隠せる開閉式に改良】画角ズーム ＋ 位置調整スライダー */}
                {showZoomPanel && (
                  <div className="pt-3 border-t border-zinc-800/60 space-y-2 bg-black/40 p-2.5 rounded-xl border border-zinc-900 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-400 tracking-wider flex items-center gap-1">
                        <ZoomIn size={12} /> 画角ズーム調整中: {activeTab.zoom.toFixed(1)}x
                      </span>
                      {(activeTab.zoom !== 1 || activeTab.panX !== 0 || activeTab.panY !== 0) && (
                        <button 
                          onClick={() => updateActiveTab({ zoom: 1, panX: 0, panY: 0 })}
                          className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded font-bold transition-all hover:bg-amber-500/20"
                        >
                          位置リセット
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* 倍率 */}
                      <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800/80">
                        <span className="text-[9px] text-zinc-400 w-12 font-medium pl-1">拡大率</span>
                        <input 
                          type="range" 
                          min={1.0} 
                          max={3.0} 
                          step={0.1} 
                          value={activeTab.zoom} 
                          onChange={(e) => updateActiveTab({ zoom: parseFloat(e.target.value) })} 
                          className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer" 
                        />
                      </div>

                      {/* 左右位置 */}
                      <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800/80">
                        <span className="text-[9px] text-zinc-400 w-12 font-medium pl-1">左右移動</span>
                        <input 
                          type="range" 
                          min={-300} 
                          max={300} 
                          step={1} 
                          value={activeTab.panX} 
                          disabled={activeTab.zoom === 1}
                          onChange={(e) => updateActiveTab({ panX: parseInt(e.target.value) })} 
                          className={`flex-1 h-1 rounded-lg appearance-none cursor-pointer ${activeTab.zoom === 1 ? "accent-zinc-600 bg-zinc-900 cursor-not-allowed" : "accent-white bg-zinc-800"}`} 
                        />
                      </div>

                      {/* 上下位置 */}
                      <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800/80">
                        <span className="text-[9px] text-zinc-400 w-12 font-medium pl-1">上下移動</span>
                        <input 
                          type="range" 
                          min={-300} 
                          max={300} 
                          step={1} 
                          value={activeTab.panY} 
                          disabled={activeTab.zoom === 1}
                          onChange={(e) => updateActiveTab({ panY: parseInt(e.target.value) })} 
                          className={`flex-1 h-1 rounded-lg appearance-none cursor-pointer ${activeTab.zoom === 1 ? "accent-zinc-600 bg-zinc-900 cursor-not-allowed" : "accent-white bg-zinc-800"}`} 
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* 右側：メモ */}
          <div className="w-full lg:w-[360px] xl:w-[400px] bg-[#121215] flex flex-col p-4 space-y-3 min-h-[300px] lg:min-h-0">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2 gap-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <FileText size={14} />
                <h2 className="text-xs font-bold tracking-wider uppercase">練習ノート</h2>
              </div>
              {activeTab.videoSrc && (
                <button onClick={insertTimestamp} className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] px-2.5 py-1 rounded-xl transition-all font-bold shadow-sm"><Clock size={12} /><span>タイムスタンプ挿入</span></button>
              )}
            </div>
            
            <textarea
              value={activeTab.notes}
              onChange={(e) => updateActiveTab({ notes: e.target.value })}
              placeholder="例:&#10;1:02 ここの足のキャッチが遅い&#10;0:45 軸をまっすぐにする意識！"
              className="w-full h-24 lg:h-32 bg-[#16161A] border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none font-sans leading-relaxed"
            />

            <div className="flex-1 bg-[#16161A]/50 border border-zinc-800/60 rounded-xl p-3 overflow-y-auto text-xs text-zinc-300 font-sans leading-loose max-h-[200px] lg:max-h-none">
              {renderNotesWithTimestamps(activeTab.notes)}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}