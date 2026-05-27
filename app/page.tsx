"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Play, Pause, RotateCw, FlipHorizontal, Grid, 
  Upload, X, FileText, Edit2, Search, Folder, Calendar, Palette
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
  const [searchTerm, setSearchTerm] = useState("");
  const [showHome, setShowHome] = useState(true);

  // 初回起動時にタブがなければ作成
  useEffect(() => {
    if (tabs.length === 0) {
      addNewTab("一般");
    }
  }, []);

  const addNewTab = (folder = "新規フォルダ") => {
    const newTab: VideoTab = {
      id: `tab-${Date.now()}`,
      name: "新しい練習",
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

  // 検索・絞り込み
  const filteredTabs = tabs.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.folder.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeTab = tabs.find(t => t.id === activeTabId);

  // 回転と反転のロジック修正: Transformを分ける
  const getTransform = (rotation: number, isMirrored: boolean) => {
    const rotate = `rotate(${rotation}deg)`;
    const scale = isMirrored ? "scaleX(-1)" : "scaleX(1)";
    return `${rotate} ${scale}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 p-4 font-sans">
      {showHome ? (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Choreo Lab 3.0</h1>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-zinc-600" size={16} />
              <input 
                placeholder="検索..." 
                className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredTabs.map(tab => (
              <div key={tab.id} onClick={() => { setActiveTabId(tab.id); setShowHome(false); }} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 cursor-pointer hover:border-zinc-600">
                <div className="flex justify-between text-xs text-zinc-500 mb-2"><span>{tab.folder}</span><span>{tab.createdAt}</span></div>
                <h3 className="font-bold">{tab.name}</h3>
              </div>
            ))}
            <button onClick={() => addNewTab()} className="border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center p-8 text-zinc-600 hover:text-zinc-400"><Plus /> 新規作成</button>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          {/* ここに以前のプレイヤーロジックが入る（簡略化） */}
          <button onClick={() => setShowHome(true)} className="text-sm mb-4 text-zinc-500">← ホームに戻る</button>
          {activeTab && (
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
               <video
                 src={activeTab.videoSrc || ""}
                 className="w-full h-full object-contain"
                 style={{ transform: getTransform(activeTab.rotation, activeTab.isMirrored) }}
               />
               {activeTab.showGrid && (
                 <div className="absolute inset-0 pointer-events-none" style={{ borderColor: activeTab.gridColor, borderWidth: '2px' }}>
                    {/* ここにカスタムカラーのグリッド実装 */}
                 </div>
               )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}