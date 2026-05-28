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
  Plus,
  X,
  RotateCw,
  FileText,
  Edit2,
  Folder,
  Clock,
  Settings2,
  RefreshCw,
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
  loopStart: number | null; // 【新機能】A-Bループ開始点
  loopEnd: number | null;   // 【新機能】A-Bループ終了点
}

const DB_NAME = "video-analyzer-db";
const STORE_NAME = "videos";

// IndexedDB のオープン
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
  // 【新機能】動的フォルダ（カテゴリ）リストの読み込み
  const [categories, setCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const savedCats = localStorage.getItem("video-analyzer-categories");
      if (savedCats) return JSON.parse(savedCats);
    }
    return ["フットワーク", "パワームーブ", "バトル", "ルーティン", "その他"];
  });

  // 保存データ読み込み
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
  
  // 編集関連のステート
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isManagingCats, setIsManagingCats] = useState(false); // フォルダ管理モードのトグル
  const [newCatName, setNewCatName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // フォルダでフィルタリング
  const filteredTabs = tabs.filter(
    (tab) => currentCategory === "すべて" || tab.category === currentCategory
  );

  // フォルダ自動保存
  useEffect(() => {
    localStorage.setItem("video-analyzer-categories", JSON.stringify(categories));
  }, [categories]);

  // タブ自動保存
  useEffect(() => {
    const safeTabs = tabs.map((tab) => ({
      ...tab,
      videoSrc: null,
    }));
    localStorage.setItem("video-analyzer-tabs", JSON.stringify(safeTabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem("video-analyzer-active-tab", activeTabId);
  }, [activeTabId]);

  // 動画の一括復元
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
        console.error("動画の一括復元に失敗しました:", err);
      }
    };
    restoreVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateActiveTab = (updates: Partial<VideoTab>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updates } : tab))
    );
  };

  useEffect(() => {
    setIsPlaying(false);
  }, [activeTabId]);

  // 再生速度・A-Bループ監視
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = activeTab.playbackRate;
    }
  }, [activeTabId, activeTab.playbackRate, activeTab.videoSrc]);

  // 【新機能】A-Bループ再生のトリガー
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // ループ範囲を超えたら巻き戻す
    if (activeTab.loopStart !== null && activeTab.loopEnd !== null) {
      if (time >= activeTab.loopEnd) {
        videoRef.current.currentTime = activeTab.loopStart;
      }
    }
  };

  // 【新機能】フォルダの追加
  const addCategory = () => {
    const trimmed = newCatName.trim();
    if (trimmed && !categories.includes(trimmed) && trimmed !== "すべて") {
      setCategories([...categories, trimmed]);
      setNewCatName("");
    }
  };

  // 【新機能】フォルダの削除（削除されたフォルダのタブは「その他」へ逃がす）
  const deleteCategory = (catToDelete: string) => {
    if (categories.length <= 1) return; // 最低1つは残す
    setCategories(categories.filter((c) => c !== catToDelete));
    setTabs((prev) =>
      prev.map((t) => (t.category === catToDelete ? { ...t, category: "その他" } : t))
    );
    if (currentCategory === catToDelete) {
      setCurrentCategory("すべて");
    }
  };

  // 【新機能】A-Bループ制御
  const setLoopPoint = (type: "start" | "end") => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    if (type === "start") {
      updateActiveTab({ loopStart: time });
    } else {
      // 開始点より後ろの時だけB点をセット可能
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
    if (isPlaying) { videoRef.current.pause(); } else { videoRef.current.play(); }
    setIsPlaying(!isPlaying);
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
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 flex flex-col items-center justify-start p-2 md:p-6 font-sans select-none">
      <div className="w-full max-w-6xl bg-[#121215] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* ================= フォルダ（カテゴリ）切り替えバー ================= */}
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

          {/* フォルダ自体の編集・追加UI */}
          <div className="flex items-center gap-2 self-end md:self-auto">
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

        {/* 【インライン展開】フォルダ管理パネル */}
        {isManagingCats && (
          <div className="bg-[#15151a] border-b border-zinc-800 p-3 flex flex-col gap-3 animate-fadeIn">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="新しいフォルダ名"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                className="bg-zinc-900 text-xs text-white border border-zinc-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-zinc-700"
              />
              <button onClick={addCategory} className="bg-zinc-200 text-black text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1"><Plus size={12} />追加</button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-800/40">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-xl text-xs text-zinc-300">
                  {/* フォルダ名のインライン編集 */}
                  <input
                    type="text"
                    value={cat}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setCategories(categories.map((c) => (c === cat ? newName : c)));
                      setTabs(tabs.map((t) => (t.category === cat ? { ...t, category: newName } : t)));
                    }}
                    className="bg-transparent font-medium focus:outline-none focus:underline w-20 md:w-24 text-zinc-200"
                  />
                  {categories.length > 1 && (
                    <X size={12} className="text-zinc-500 hover:text-red-400 cursor-pointer ml-1" onClick={() => deleteCategory(cat)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= タブバー ================= */}
        <div className="bg-[#16161A] border-b border-zinc-800 p-2 md:p-3 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar">
            {filteredTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => { setActiveTabId(tab.id); }}
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
                    {/* 【強化】作成後にいつでも別フォルダに移動できる選択セレクト */}
                    <select
                      value={tab.category}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setTabs((prev) => prev.map((t) => (t.id === tab.id ? { ...t, category: newCat } : t)));
                      }}
                      className="bg-zinc-950 text-amber-400 border border-zinc-800 rounded px-1 py-0.5 text-[10px] font-bold focus:outline-none cursor-pointer"
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

        {/* ================= メインコンテンツエリア ================= */}
        <div className="flex flex-col lg:flex-row border-b border-zinc-800">
          
          {/* 左側：ビデオ表示エリア ＆ コントローラー */}
          <div className="flex-1 bg-black flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800">
            <div className="relative aspect-video flex items-center justify-center p-2 overflow-hidden bg-[#050506]">
              {activeTab.videoSrc ? (
                <div className="w-full h-full flex items-center justify-center transition-transform duration-300" style={{ transform: `rotate(${activeTab.rotation}deg)` }}>
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

                  {/* 【新機能】ビジュアルループインジケーター（動画上にA-B区間を表示） */}
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

            {/* ビデオコントローラー */}
            {activeTab.videoSrc && (
              <div className="p-3 md:p-4 bg-[#121215] space-y-3 border-t border-zinc-800/80">
                {/* シークバー */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-400 w-8">{formatTime(currentTime)}</span>
                  <input type="range" min={0} max={duration || 100} step={0.01} value={currentTime} onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = parseFloat(e.target.value); }} className="flex-1 accent-white bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer" />
                  <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">{formatTime(duration)}</span>
                </div>

                {/* 各種操作ボタン群 ＆ 【新機能】A-BループコントロールUI */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => stepFrame("backward")} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"><ChevronsLeft size={14} /></button>
                    <button onClick={togglePlay} className="p-2.5 rounded-lg bg-white text-black font-bold shadow-md">{isPlaying ? <Pause size={14} fill="black" /> : <Play size={14} fill="black" />}</button>
                    <button onClick={() => stepFrame("forward")} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"><ChevronsRight size={14} /></button>
                  </div>

                  {/* 【新機能】A-Bループボタン */}
                  <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-zinc-800 text-[10px] font-bold">
                    <button onClick={() => setLoopPoint("start")} className={`px-2 py-1 rounded-lg ${activeTab.loopStart !== null ? "bg-amber-500/20 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}>[A点] 開始</button>
                    <button onClick={() => setLoopPoint("end")} className={`px-2 py-1 rounded-lg ${activeTab.loopEnd !== null ? "bg-amber-500/20 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}>[B点] 終了</button>
                    {(activeTab.loopStart !== null || activeTab.loopEnd !== null) && (
                      <button onClick={clearLoop} className="px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10">解除</button>
                    )}
                  </div>

                  <div className="flex items-center bg-zinc-900 p-0.5 rounded-xl border border-zinc-800 text-[11px]">
                    <button onClick={() => updateActiveTab({ isMirrored: !activeTab.isMirrored })} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${activeTab.isMirrored ? "bg-zinc-800 text-white" : "text-zinc-500"}`}><FlipHorizontal size={12} />ミラー</button>
                    <button onClick={toggleRotation} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${activeTab.rotation !== 0 ? "bg-zinc-800 text-amber-400" : "text-zinc-500"}`}><RotateCw size={12} />{activeTab.rotation}°</button>
                    <button onClick={() => updateActiveTab({ showGrid: !activeTab.showGrid })} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${activeTab.showGrid ? "bg-zinc-800 text-white" : "text-zinc-500"}`}><Grid size={12} />グリッド</button>
                  </div>
                </div>

                {/* スピード調整 */}
                <div className="flex items-center gap-3 pt-1 border-t border-zinc-800/40">
                  <span className="text-[10px] font-bold text-zinc-500 tracking-wider whitespace-nowrap">SPEED: {activeTab.playbackRate.toFixed(2)}x</span>
                  <input type="range" min={0.25} max={2.0} step={0.05} value={activeTab.playbackRate} onChange={(e) => updateActiveTab({ playbackRate: parseFloat(e.target.value) })} className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          {/* 右側：メモ＆タイムスタンププレビュー */}
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
              className="w-full h-24 lg:h-32 bg-[#16161A] border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none font-sans leading-relaxed"
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