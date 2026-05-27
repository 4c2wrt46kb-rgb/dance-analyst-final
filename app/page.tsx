"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Play, Pause, RotateCcw, FlipHorizontal, Grid, 
  ChevronsLeft, ChevronsRight, Upload, Plus, X, RotateCw, FileText, Edit2
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
}

export default function VideoAnalyzer() {
  export default function VideoAnalyzer() {
  // --- ここに追加 ---
  // 1. 初回起動時にデータを復元
  useEffect(() => {
    const saved = localStorage.getItem("choreo-lab-data");
    if (saved) {
      try {
        setTabs(JSON.parse(saved));
      } catch (e) {
        console.error("データの読み込みに失敗しました", e);
      }
    }
  }, []);

  // 2. tabs の中身が変わるたびに自動保存
  useEffect(() => {
    localStorage.setItem("choreo-lab-data", JSON.stringify(tabs));
  }, [tabs]);
  // ------------------

  const [tabs, setTabs] = useState<VideoTab[]>([ ...
  const [tabs, setTabs] = useState<VideoTab[]>([
    {
      id: "tab-1",
      name: "セッション 1",
      videoSrc: null,
      isMirrored: false,
      rotation: 0,
      showGrid: false,
      playbackRate: 1,
      notes: "",
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("tab-1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateActiveTab = (updates: Partial<VideoTab>) => {
    setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, ...updates } : tab));
  };

  // タブ切り替え時にビデオの再生速度を再適用
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = activeTab.playbackRate;
      // 時間初期化
      setCurrentTime(videoRef.current.currentTime || 0);
    }
    setIsPlaying(false);
  }, [activeTabId, activeTab.playbackRate]);

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
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setIsPlaying(false);
  };

  const closeTab = (idToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const filtered = tabs.filter(tab => tab.id !== idToClose);
    setTabs(filtered);
    if (activeTabId === idToClose) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
    setIsPlaying(false);
  };

  const startRename = (tab: VideoTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditName(tab.name);
  };

  const saveRename = () => {
    if (editName.trim()) {
      setTabs(prev => prev.map(t => t.id === editingTabId ? { ...t, name: editName } : t));
    }
    setEditingTabId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateActiveTab({ videoSrc: url, name: file.name.substring(0, 10) });
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); } else { videoRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const handleRateSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.playbackRate = rate;
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

  // タイムスタンプをクリックした時のシーク処理
  const jumpToTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // メモ内の「01:23」や「0:45」を判定してリンク化する関数
  const renderNotesWithTimestamps = (text: string) => {
    if (!text) return <span className="text-zinc-600 text-xs">ここにメモを入力すると、タイムスタンプが自動生成されます。</span>;
    
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // mm:ss または m:ss の正規表現
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
        
        {/* ================= タブバー ================= */}
        <div className="bg-[#16161A] border-b border-zinc-800 p-2 md:p-3 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => { setActiveTabId(tab.id); setIsPlaying(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 md:py-2 rounded-xl text-xs font-medium cursor-pointer transition-all border ${
                  tab.id === activeTabId
                    ? "bg-zinc-800 text-white border-zinc-700 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 bg-transparent border-transparent"
                }`}
              >
                {editingTabId === tab.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={saveRename}
                    onKeyDown={(e) => e.key === "Enter" && saveRename()}
                    autoFocus
                    className="bg-zinc-900 text-white border border-zinc-700 rounded px-1 py-0.5 w-20 text-xs focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex items-center gap-1" onDoubleClick={(e) => startRename(tab, e)} onClick={(e) => tab.id === activeTabId && startRename(tab, e)}>
                    {tab.name}
                    <Edit2 size={10} className="opacity-40" />
                  </span>
                )}
                {tabs.length > 1 && (
                  <X size={12} className="hover:bg-zinc-700 p-0.5 rounded-full" onClick={(e) => closeTab(tab.id, e)} />
                )}
              </div>
            ))}
            <button onClick={addNewTab} className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400"><Plus size={12} /></button>
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 bg-zinc-200 text-black text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap"><Upload size={12} />動画読込</button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />
        </div>

        {/* ================= メインレイアウト（スマホでは1カラム、PCでは2カラム） ================= */}
        <div className="flex flex-col lg:flex-row border-b border-zinc-800">
          
          {/* 左：ビデオ＋そのすぐ下にコントローラー */}
          <div className="flex-1 bg-black flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800">
            <div className="relative aspect-video flex items-center justify-center p-2 overflow-hidden bg-[#050506]">
              {activeTab.videoSrc ? (
                <div className="w-full h-full flex items-center justify-center transition-transform duration-300" style={{ transform: `rotate(${activeTab.rotation}deg)` }}>
                  <video
                    ref={videoRef}
                    key={activeTab.id}
                    src={activeTab.videoSrc}
                    playsInline
                    className={`w-full h-full object-contain ${activeTab.isMirrored ? "scale-x-[-1]" : ""}`}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
                    onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
                    onClick={togglePlay}
                  />
                  {/* 濃くしたグリッド線 (border-white/50) */}
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

            {/* ====== 動画のすぐ下のコントロールパネル ====== */}
            {activeTab.videoSrc && (
              <div className="p-3 md:p-4 bg-[#121215] space-y-3 border-t border-zinc-800/80">
                {/* プログレスバー */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-400 w-8">{formatTime(currentTime)}</span>
                  <input type="range" min={0} max={duration || 100} step={0.01} value={currentTime} onChange={handleSeek} className="flex-1 accent-white bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer" />
                  <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">{formatTime(duration)}</span>
                </div>

                {/* ボタン群 */}
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

                {/* 速度調整スライダーバー */}
                <div className="flex items-center gap-3 pt-1 border-t border-zinc-800/40">
                  <span className="text-[10px] font-bold text-zinc-500 tracking-wider whitespace-nowrap">SPEED: {activeTab.playbackRate.toFixed(2)}x</span>
                  <input type="range" min={0.25} max={2.0} step={0.05} value={activeTab.playbackRate} onChange={handleRateSliderChange} className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          {/* 右（下）：ノートエリア（入力・出力の分離型） */}
          <div className="w-full lg:w-[360px] xl:w-[400px] bg-[#121215] flex flex-col p-4 space-y-3 min-h-[300px] lg:min-h-0">
            <div className="flex items-center gap-2 text-zinc-400 border-b border-zinc-800/60 pb-2">
              <FileText size={14} />
              <h2 className="text-xs font-bold tracking-wider uppercase">練習ノート & タイムスタンプ</h2>
            </div>
            
            {/* テキスト入力欄 */}
            <textarea
              value={activeTab.notes}
              onChange={(e) => updateActiveTab({ notes: e.target.value })}
              placeholder="例:&#10;1:02 ここの足のキャッチが遅い&#10;0:45 軸をまっすぐにする意識！"
              className="w-full h-24 lg:h-32 bg-[#16161A] border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none font-sans leading-relaxed"
            />

            {/* タイムスタンプ出力画面（クリック可能なプレビュー） */}
            <div className="flex-1 bg-[#16161A]/50 border border-zinc-800/60 rounded-xl p-3 overflow-y-auto text-xs text-zinc-300 font-sans leading-loose max-h-[200px] lg:max-h-none">
              {renderNotesWithTimestamps(activeTab.notes)}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}