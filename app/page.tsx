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
  category: string; // 【追加】フォルダ（カテゴリ）分類用
}

const DB_NAME = "video-analyzer-db";
const STORE_NAME = "videos";

// 固定のフォルダ（カテゴリ）リスト
const CATEGORIES = ["すべて", "フットワーク", "パワームーブ", "バトル", "ルーティン", "その他"];

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

// 動画ファイルを保存
const saveVideoToDB = async (id: string, file: File) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// 動画ファイルを取得
const getVideoFromDB = async (id: string): Promise<File | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// 動画ファイルを削除
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
  // 保存データ読み込み
  const [tabs, setTabs] = useState<VideoTab[]>(() => {
    if (typeof window !== "undefined") {
      const savedTabs = localStorage.getItem("video-analyzer-tabs");
      if (savedTabs) {
        const parsedTabs: VideoTab[] = JSON.parse(savedTabs);
        return parsedTabs.map((tab) => ({
          ...tab,
          videoSrc: null,
          category: tab.category || "その他", // 互換性担保
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
      },
    ];
  });

  // アクティブタブ保存
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("video-analyzer-active-tab") || "tab-1";
    }
    return "tab-1";
  });

  // 【追加】現在選択されているフォルダ（カテゴリ）のステート
  const [currentCategory, setCurrentCategory] = useState("すべて");

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // フォルダ（カテゴリ）でフィルタリングされたタブ一覧
  const filteredTabs = tabs.filter(
    (tab) => currentCategory === "すべて" || tab.category === currentCategory
  );

  // フォルダを切り替えた時、現在のアクティブタブがそのフォルダ内に無ければ、自動でフォルダ内の先頭タブに切り替える
  const handleCategoryChange = (cat: string) => {
    setCurrentCategory(cat);
    const matches = tabs.filter((t) => cat === "すべて" || t.category === cat);
    if (matches.length > 0 && !matches.some((t) => t.id === activeTabId)) {
      setActiveTabId(matches[0].id);
    }
  };

  // アプリ起動時に全タブの動画を一括復元するロジック
  useEffect(() => {
    const restoreVideos = async () => {
      try {
        const updatedTabs = await Promise.all(
          tabs.map(async (tab) => {
            const file = await getVideoFromDB(tab.id);
            if (!file) return tab;

            return {
              ...tab,
              videoSrc: URL.createObjectURL(file),
            };
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

  // 自動保存（localStorageにはUI状態、ノート、カテゴリだけを安全に保存）
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

  const updateActiveTab = (updates: Partial<VideoTab>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updates } : tab))
    );
  };

  // タブ切り替え時のリセット
  useEffect(() => {
    setIsPlaying(false);
  }, [activeTabId]);

  // ビデオ要素の再生速度同期
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = activeTab.playbackRate;
      setCurrentTime(videoRef.current.currentTime || 0);
    }
  }, [activeTabId, activeTab.playbackRate, activeTab.videoSrc]);

  // 【追加】現在の再生時間をメモにワンプッシュ挿入する関数
  const insertTimestamp = () => {
    if (!videoRef.current) return;
    const timeStr = formatTime(videoRef.current.currentTime);
    
    // 現在のメモの末尾に、綺麗に改行を挟んで挿入する
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
      category: currentCategory === "すべて" ? "その他" : currentCategory, // いま開いているフォルダをデフォルトにする親切設計
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setIsPlaying(false);
  };

  // タブを閉じる際、IndexedDB の中の該当動画も一緒に削除する
  const closeTab = async (idToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;

    const filtered = tabs.filter((tab) => tab.id !== idToClose);
    setTabs(filtered);

    if (activeTabId === idToClose) {
      // フィルター後の表示中タブから次なるアクティブを選ぶ
      const remMatches = filtered.filter((t) => currentCategory === "すべて" || t.category === currentCategory);
      if (remMatches.length > 0) {
        setActiveTabId(remMatches[remMatches.length - 1].id);
      } else if (filtered.length > 0) {
        setActiveTabId(filtered[filtered.length - 1].id);
      }
    }
    setIsPlaying(false);

    try {
      await deleteVideoFromDB(idToClose);
    } catch (err) {
      console.error("IndexedDBからの動画削除に失敗しました:", err);
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
      
      updateActiveTab({
        videoSrc: url,
        name: file.name.substring(0, 10),
      });
      setIsPlaying(false);

      try {
        await saveVideoToDB(activeTabId, file);
      } catch (err) {
        console.error("IndexedDBへの動画保存に失敗しました:", err);
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

  const handleRateSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    updateActiveTab({ playbackRate: rate });
  };

  const toggleRotation = () => {
    updateActiveTab({ rotation: (activeTab.rotation + 90) % 360 });
  };

  const stepFrame = (direction: "forward" | "backward") => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime += direction === "forward" ? 1 / 30 : -1 / 30;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
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
    if (!text) {
      return (
        <span className="text-zinc-600 text-xs">
          ここにメモを入力するか、上の「⏱️ タイムスタンプ」を押すと自動生成されます。
        </span>
      );
    }

    const lines = text.split("\n");
    return lines.map((line, i) => {
      const timestampRegex = /(\d{1,2}):(\d{2})/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = timestampRegex.exec(line)) !== null) {
        const matchIndex = match.index;
        if (matchIndex > lastIndex) {
          parts.push(line.substring(lastIndex, matchIndex));
        }

        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const totalSeconds = mins * 60 + secs;

        parts.push(
          <button
            key={matchIndex}
            onClick={() => jumpToTime(totalSeconds)}
            className="text-amber-400 hover:text-amber-300 font-mono font-bold underline bg-amber-500/10 px-1 rounded transition-colors inline-block my-0.5 mx-0.5"
          >
            {match[0]}
          </button>
        );
        lastIndex = timestampRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      return (
        <div key={i} className="min-h-[1.5rem] break-all">
          {parts.length > 0 ? parts : line}
        </div>
      );
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
        
        {/* ================= 【新機能】フォルダ（カテゴリ）切り替えバー ================= */}
        <div className="bg-[#1a1a22] border-b border-zinc-800 p-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-zinc-800 text-xs">
            <div className="flex items-center gap-1 px-2 text-zinc-400 font-bold border-r border-zinc-800 mr-1">
              <Folder size={12} className="text-amber-400" />
              <span>フォルダ:</span>
            </div>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  currentCategory === cat
                    ? "bg-amber-500 text-black font-bold shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-zinc-500 ml-auto hidden md:inline px-2">
            ※ダブルクリック（またはタップ）で名前と所属フォルダを変更可能
          </span>
        </div>

        {/* ================= タブバー ================= */}
        <div className="bg-[#16161A] border-b border-zinc-800 p-2 md:p-3 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar">
            {filteredTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => { setActiveTabId(tab.id); }}
                className={`flex items-center gap-2 px-3 py-1.5 md:py-2 rounded-xl text-xs font-medium cursor-pointer transition-all border ${
                  tab.id === activeTabId
                    ? "bg-zinc-800 text-white border-zinc-700 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 bg-transparent border-transparent"
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
                      className="bg-zinc-900 text-white border border-zinc-700 rounded px-1 py-0.5 w-20 text-xs focus:outline-none"
                    />
                    {/* 【新機能】編集モード時に所属フォルダをセレクトボックスで変更可能 */}
                    <select
                      value={tab.category}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setTabs((prev) =>
                          prev.map((t) => (t.id === tab.id ? { ...t, category: newCat } : t))
                        );
                      }}
                      className="bg-zinc-900 text-zinc-300 border border-zinc-700 rounded px-1 py-0.5 text-[10px] focus:outline-none cursor-pointer"
                    >
                      {CATEGORIES.filter(c => c !== "すべて").map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5" onDoubleClick={(e) => startRename(tab, e)} onClick={(e) => tab.id === activeTabId && startRename(tab, e)}>
                    <span className="text-[10px] px-1 py-0.2 bg-zinc-900 rounded text-zinc-400 border border-zinc-700/60 font-mono">{tab.category}</span>
                    {tab.name}
                    <Edit2 size={10} className="opacity-40" />
                  </span>
                )}
                {tabs.length > 1 && (
                  <X size={12} className="hover:bg-zinc-700 p-0.5 rounded-full" onClick={(e) => closeTab(tab.id, e)} />
                )}
              </div>
            ))}
            {filteredTabs.length === 0 && (
              <span className="text-xs text-zinc-600 px-2">このフォルダは空です</span>
            )}
            <button onClick={addNewTab} className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400"><Plus size={12} /></button>
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
                    onError={() => {
                      console.log("動画のロード中、または有効期限切れを検知しました");
                    }}
                    className={`w-full h-full object-contain ${activeTab.isMirrored ? "scale-x-[-1]" : ""}`}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
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
                  <input type="range" min={0} max={duration || 100} step={0.01} value={currentTime} onChange={handleSeek} className="flex-1 accent-white bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer" />
                  <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">{formatTime(duration)}</span>
                </div>

                {/* 各種操作ボタン群 */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => stepFrame("backward")} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"><ChevronsLeft size={14} /></button>
                    <button onClick={togglePlay} className="p-2.5 rounded-lg bg-white text-black font-bold shadow-md">{isPlaying ? <Pause size={14} fill="black" /> : <Play size={14} fill="black" />}</button>
                    <button onClick={() => stepFrame("forward")} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"><ChevronsRight size={14} /></button>
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
                  <input type="range" min={0.25} max={2.0} step={0.05} value={activeTab.playbackRate} onChange={handleRateSliderChange} className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          {/* 右側：メモ＆タイムスタンププレビュー */}
          <div className="w-full lg:w-[360px] xl:w-[400px] bg-[#121215] flex flex-col p-4 space-y-3 min-h-[300px] lg:min-h-0">
            
            {/* メモ帳ヘッダー ＆ 【新機能】タイムスタンプ一発挿入ボタン */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2 gap-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <FileText size={14} />
                <h2 className="text-xs font-bold tracking-wider uppercase">練習ノート</h2>
              </div>
              
              {/* ⏱️ タイムスタンプ一発挿入ボタン */}
              {activeTab.videoSrc && (
                <button
                  onClick={insertTimestamp}
                  className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] px-2.5 py-1 rounded-xl transition-all font-bold shadow-sm"
                >
                  <Clock size={12} />
                  <span>タイムスタンプ挿入</span>
                </button>
              )}
            </div>
            
            {/* テキストエディタ欄 */}
            <textarea
              value={activeTab.notes}
              onChange={(e) => updateActiveTab({ notes: e.target.value })}
              placeholder="例:&#10;1:02 ここの足のキャッチが遅い&#10;0:45 軸をまっすぐにする意識！"
              className="w-full h-24 lg:h-32 bg-[#16161A] border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none font-sans leading-relaxed"
            />

            {/* インタラクティブプレビュー */}
            <div className="flex-1 bg-[#16161A]/50 border border-zinc-800/60 rounded-xl p-3 overflow-y-auto text-xs text-zinc-300 font-sans leading-loose max-h-[200px] lg:max-h-none">
              {renderNotesWithTimestamps(activeTab.notes)}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}