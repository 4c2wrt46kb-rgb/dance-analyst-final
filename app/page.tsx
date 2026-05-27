"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Play, Pause, FlipHorizontal, Grid, ChevronsLeft, ChevronsRight, 
  Upload, Plus, X, RotateCw, FileText, Edit2, Folder, Home
} from "lucide-react";

interface VideoTab {
  id: string;
  name: string;
  folder: string; // ← フォルダ名を追加
  videoSrc: string | null;
  isMirrored: boolean;
  rotation: number;
  showGrid: boolean;
  playbackRate: number;
  notes: string;
}

export default function VideoAnalyzer() {
  const [tabs, setTabs] = useState<VideoTab[]>([
    { id: "tab-1", name: "セッション 1", folder: "基本練習", videoSrc: null, isMirrored: false, rotation: 0, showGrid: false, playbackRate: 1, notes: "" }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("tab-1");
  const [showHome, setShowHome] = useState(false); // ← ホーム画面フラグ
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateActiveTab = (updates: Partial<VideoTab>) => {
    setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, ...updates } : tab));
  };

  const addNewTab = (folderName: string = "新しいフォルダ") => {
    const newId = `tab-${Date.now()}`;
    setTabs([...tabs, { id: newId, name: "新しいセッション", folder: folderName, videoSrc: null, isMirrored: false, rotation: 0, showGrid: false, playbackRate: 1, notes: "" }]);
    setActiveTabId(newId);
    setShowHome(false);
  };

  // タイムスタンプなどの既存関数はそのまま
  const jumpToTime = (seconds: number) => {
    if (videoRef.current) { videoRef.current.currentTime = seconds; videoRef.current.play(); setIsPlaying(true); }
  };

  const renderNotesWithTimestamps = (text: string) => {
    return text.split("\n").map((line, i) => {
      const timestampRegex = /(\d{1,2}):(\d{2})/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0, match;
      while ((match = timestampRegex.exec(line)) !== null) {
        parts.push(line.substring(lastIndex, match.index));
        const totalSeconds = parseInt(match[1]) * 60 + parseInt(match[2]);
        parts.push(<button key={match.index} onClick={() => jumpToTime(totalSeconds)} className="text-amber-400 underline font-bold mx-1">{match[0]}</button>);
        lastIndex = timestampRegex.lastIndex;
      }
      parts.push(line.substring(lastIndex));
      return <div key={i} className="min-h-[1.5rem]">{parts}</div>;
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 p-4 font-sans">
      {/* --- ホーム画面 --- */}
      {showHome ? (
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-xl font-bold flex items-center gap-2"><Folder /> 練習ライブラリ</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tabs.map(tab => (
              <div key={tab.id} onClick={() => { setActiveTabId(tab.id); setShowHome(false); }} className="bg-[#121215] p-4 rounded-xl border border-zinc-800 cursor-pointer hover:border-zinc-600">
                <span className="text-[10px] text-zinc-500 uppercase">{tab.folder}</span>
                <div className="font-bold">{tab.name}</div>
              </div>
            ))}
            <button onClick={() => addNewTab()} className="border-2 border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-zinc-600">
              <Plus /> <span className="text-xs mt-1">追加</span>
            </button>
          </div>
        </div>
      ) : (
        /* --- 既存のプレイヤー画面 --- */
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setShowHome(true)} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white"><Home size={16}/> ホームへ戻る</button>
            <div className="text-xs text-zinc-500">現在: {activeTab.name} ({activeTab.folder})</div>
          </div>
          {/* ここから下に以前のビデオプレイヤーコードをそのまま維持 */}
          <div className="w-full bg-[#121215] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
            {/* ... 既存のプレイヤーロジックをここに継続 ... */}
             <div className="p-4 bg-black aspect-video flex items-center justify-center">
                {activeTab.videoSrc ? (
                    <video ref={videoRef} src={activeTab.videoSrc} className="w-full h-full object-contain" />
                ) : (
                    <button onClick={() => fileInputRef.current?.click()} className="text-zinc-600">動画読み込み</button>
                )}
                <input type="file" ref={fileInputRef} onChange={(e) => updateActiveTab({ videoSrc: URL.createObjectURL(e.target.files![0]) })} className="hidden" />
             </div>
             {/* 以下、以前のコントロールとメモ欄へ繋ぐ */}
          </div>
        </div>
      )}
    </div>
  );
}