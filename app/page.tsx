"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Play, Pause, RotateCw, FlipHorizontal, Grid, 
  Upload, X, FileText, Edit2, Search, Folder, Calendar, Palette, Plus, ChevronLeft
} from "lucide-react";

// 型定義
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
  const [searchTerm, setSearchTerm] = useState("");
  const [showHome, setShowHome] = useState(true);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tabs.length === 0) addNewTab("デフォルト");
  }, []);

  const addNewTab = (folder = "一般") => {
    const newTab: VideoTab = {
      id: `tab-${Date.now()}`,
      name: "新しい練習動画",
      folder: folder,
      createdAt: new Date().toLocaleDateString(),
      videoSrc: null,
      isMirrored: false,
      rotation: 0,
      showGrid: false,
      gridColor: "#ffffff",
      playbackRate: 1,
      notes: "",
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setShowHome(false);
  };

  const filteredTabs = tabs.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.folder.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeTab = tabs.find(t => t.id === activeTabId);

  const updateActiveTab = (updates: Partial<VideoTab>) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, ...updates } : tab));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 p-4 md:p-8 font-sans">
      {showHome ? (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Choreo Lab v3.0</h1>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-zinc-600" size={16} />
              <input 
                placeholder="フォルダや動画を検索..." 
                className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-zinc-500 outline-none"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredTabs.map(tab => (
              <div key={tab.id} onClick={() => { setActiveTabId(tab.id); setShowHome(false); }} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 cursor-pointer hover:border-zinc-600 transition-all">
                <div className="flex justify-between text-[10px] text-zinc-500 mb-2">
                  <span className="bg-zinc-800 px-2 py-0.5 rounded">{tab.folder}</span>
                  <span>{tab.createdAt}</span>
                </div>
                <h3 className="font-bold text-sm truncate">{tab.name}</h3>
              </div>
            ))}
            <button onClick={() => addNewTab()} className="border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center p-8 text-zinc-600 hover:text-zinc-400 transition-colors">
              <Plus size={24} />
              <span className="mt-2 text-xs">新規作成</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <button onClick={() => setShowHome(true)} className="flex items-center text-sm text-zinc-500 hover:text-white mb-4">
            <ChevronLeft size={16} /> ホームに戻る
          </button>
          
          {activeTab && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-black rounded-2xl overflow-hidden border border-zinc-800 p-4">
                 <div className="relative aspect-video flex items-center justify-center">
                    {activeTab.videoSrc ? (
                      <video 
                        src={activeTab.videoSrc}
                        className="w-full h-full object-contain"
                        style={{ transform: `rotate(${activeTab.rotation}deg) scaleX(${activeTab.isMirrored ? -1 : 1})` }}
                      />
                    ) : (
                      <div onClick={() => fileInputRef.current?.click()} className="text-zinc-600 cursor-pointer text-sm">動画を読み込む</div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={(e) => updateActiveTab({ videoSrc: URL.createObjectURL(e.target.files![0]) })} className="hidden" />
                 </div>
              </div>
              <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                <h2 className="text-lg font-bold mb-4">{activeTab.name}</h2>
                <div className="flex items-center gap-2 mb-4">
                   <button onClick={() => updateActiveTab({ isMirrored: !activeTab.isMirrored })} className="p-2 bg-zinc-800 rounded-lg"><FlipHorizontal size={18} /></button>
                   <button onClick={() => updateActiveTab({ rotation: (activeTab.rotation + 90) % 360 })} className="p-2 bg-zinc-800 rounded-lg"><RotateCw size={18} /></button>
                </div>
                <textarea 
                  value={activeTab.notes} 
                  onChange={(e) => updateActiveTab({ notes: e.target.value })}
                  className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none"
                  placeholder="メモを入力..."
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}