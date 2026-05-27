"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Play, Pause, RotateCw, FlipHorizontal, Grid, 
  Upload, X, FileText, Search, Plus, ChevronLeft, Edit2, ChevronsLeft, ChevronsRight, Palette
} from "lucide-react";

interface VideoTab {
  id: string;
  name: string;
  folder: string;
  createdAt: string;
  videoSrc: string | null;
  isMirrored: boolean;
  rotation: number;
  showGrid: boolean;
  gridColor: string;
  playbackRate: number;
  notes: string;
}

const GRID_COLORS = ["#ffffff", "#ff4d4d", "#4dff88", "#4d88ff", "#ffff4d"];

export default function VideoAnalyzer() {
  const [tabs, setTabs] = useState<VideoTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showHome, setShowHome] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (tabs.length === 0) addNewTab("デフォルト"); }, []);

  const addNewTab = (folder = "一般") => {
    const newTab: VideoTab = {
      id: `tab-${Date.now()}`, name: "新しい動画", folder, createdAt: new Date().toLocaleDateString(),
      videoSrc: null, isMirrored: false, rotation: 0, showGrid: false, gridColor: "#ffffff", playbackRate: 1, notes: ""
    };
    setTabs([...tabs, newTab]); setActiveTabId(newTab.id); setShowHome(false);
  };

  const activeTab = tabs.find(t => t.id === activeTabId);
  const updateActiveTab = (updates: Partial<VideoTab>) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  };

  const renderNotes = (text: string) => {
    return text.split("\n").map((line, i) => {
      const parts: React.ReactNode[] = [];
      line.split(/(\d{1,2}:\d{2})/).forEach((part, idx) => {
        if (/^\d{1,2}:\d{2}$/.test(part)) {
          const [m, s] = part.split(":").map(Number);
          parts.push(<button key={idx} onClick={() => { if(videoRef.current){ videoRef.current.currentTime = m*60+s; videoRef.current.play(); } }} className="text-amber-400 underline font-bold px-1">{part}</button>);
        } else { parts.push(part); }
      });
      return <div key={i} className="min-h-[1.5rem] break-all">{parts}</div>;
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 p-4 font-sans">
      {showHome ? (
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-white">Choreo Lab v3.0</h1>
          <input placeholder="検索..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3" onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tabs.filter(t => t.name.includes(searchTerm)).map(tab => (
              <div key={tab.id} onClick={() => { setActiveTabId(tab.id); setShowHome(false); }} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 cursor-pointer hover:border-zinc-500">{tab.name}</div>
            ))}
            <button onClick={() => addNewTab()} className="border-2 border-dashed border-zinc-800 rounded-xl p-8 flex justify-center text-zinc-600"><Plus /></button>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <button onClick={() => setShowHome(true)} className="flex items-center text-sm mb-4"><ChevronLeft size={16}/>ホーム</button>
          {activeTab && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-zinc-800">
                  {activeTab.videoSrc ? (
                    <video ref={videoRef} src={activeTab.videoSrc} className="w-full h-full object-contain" style={{ transform: `rotate(${activeTab.rotation}deg) scaleX(${activeTab.isMirrored ? -1 : 1})` }} />
                  ) : <button onClick={() => fileInputRef.current?.click()} className="text-zinc-600">動画を選択</button>}
                  <input type="file" ref={fileInputRef} onChange={(e) => updateActiveTab({ videoSrc: URL.createObjectURL(e.target.files![0]) })} className="hidden" />
                </div>
                <input type="range" min="0.25" max="2" step="0.05" value={activeTab.playbackRate} onChange={(e) => { const r = parseFloat(e.target.value); updateActiveTab({ playbackRate: r }); if(videoRef.current) videoRef.current.playbackRate = r; }} className="w-full accent-amber-500" />
              </div>
              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 space-y-4">
                <div className="flex gap-2">
                  {GRID_COLORS.map(c => <button key={c} onClick={() => updateActiveTab({ gridColor: c, showGrid: true })} className="w-6 h-6 rounded-full border" style={{ backgroundColor: c }} />)}
                </div>
                <textarea value={activeTab.notes} onChange={(e) => updateActiveTab({ notes: e.target.value })} className="w-full h-40 bg-zinc-950 p-2 text-sm border border-zinc-800 rounded" placeholder="例: 1:05 で動きを確認" />
                <div className="text-sm border-t border-zinc-800 pt-2">{renderNotes(activeTab.notes)}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}