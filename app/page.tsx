"use client";

import React, { useState, useRef } from "react";
import { 
  Play, Pause, RotateCcw, FlipHorizontal, Grid, 
  ChevronsLeft, ChevronsRight, Upload, Plus, X, RotateCw, FileText
} from "lucide-react";

// タブごとのデータを管理する型定義
interface VideoTab {
  id: string;
  name: string;
  videoSrc: string | null;
  isMirrored: boolean;
  rotation: number; // 0, 90, 180, 270
  showGrid: boolean;
  playbackRate: number;
  notes: string;
}

export default function VideoAnalyzer() {
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 現在アクティブなタブのデータを取得
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // アクティブなタブのステートを更新するヘルパー関数
  const updateActiveTab = (updates: Partial<VideoTab>) => {
    setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, ...updates } : tab));
  };

  // 新しいタブを追加
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

  // タブを削除
  const closeTab = (idToClose: string, e: React.MouseEvent) => {
    e.stopPropagation(); // タブ切り替えイベントの発火を防ぐ
    if (tabs.length === 1) return; // 最後の1つは消さない

    const filtered = tabs.filter(tab => tab.id !== idToClose);
    setTabs(filtered);

    // 消したタブがアクティブだった場合、別のタブに切り替える
    if (activeTabId === idToClose) {
      const remainingTab = filtered[filtered.length - 1];
      setActiveTabId(remainingTab.id);
    }
    setIsPlaying(false);
  };

  // 動画ファイルの読み込み
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateActiveTab({ 
        videoSrc: url, 
        name: file.name.length > 12 ? file.name.substring(0, 12) + "..." : file.name 
      });
      setIsPlaying(false);
    }
  };

  // 再生・一時停止
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // 再生速度の変更
  const handleRateChange = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    updateActiveTab({ playbackRate: rate });
  };

  // 回転の変更 (90度ずつ右回転)
  const toggleRotation = () => {
    const nextRotation = (activeTab.rotation + 90) % 360;
    updateActiveTab({ rotation: nextRotation });
  };

  // コマ送り・コマ戻し (1フレーム = 1/30秒)
  const stepFrame = (direction: "forward" | "backward") => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const frameTime = 1 / 30;
    videoRef.current.currentTime += direction === "forward" ? frameTime : -frameTime;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 flex flex-col items-center justify-start p-4 md:p-8 font-sans">
      <div className="w-full max-w-7xl bg-[#121215] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* ================= ヘッダー & タブバー ================= */}
        <div className="bg-[#16161A] border-b border-zinc-800 p-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setIsPlaying(false); // タブ切り替え時は一旦停止
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all whitespace-nowrap select-none border ${
                  tab.id === activeTabId
                    ? "bg-zinc-800 text-white border-zinc-700 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 bg-transparent border-transparent"
                }`}
              >
                <span>{tab.name}</span>
                {tabs.length > 1 && (
                  <X 
                    size={14} 
                    className="hover:bg-zinc-700 p-0.5 rounded-full transition-colors"
                    onClick={(e) => closeTab(tab.id, e)}
                  />
                )}
              </div>
            ))}
            
            <button 
              onClick={addNewTab}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="新しい動画タブを追加"
            >
              <Plus size={14} />
            </button>
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-zinc-200 hover:bg-white text-black text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 ml-auto"
          >
            <Upload size={14} />
            動画を選択
          </button>
          <input 
            type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" 
          />
        </div>

        {/* ================= メインコンテンツ（2カラムレイアウト） ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 border-b border-zinc-800">
          
          {/* 左・中央カラム：ビデオプレイヤーエリア（2/3幅） */}
          <div className="lg:col-span-2 bg-black flex flex-col justify-between min-h-[400px] lg:min-h-[550px] relative">
            <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
              {activeTab.videoSrc ? (
                <div 
                  className="w-full h-full max-h-[500px] flex items-center justify-center transition-transform duration-300"
                  style={{ transform: `rotate(${activeTab.rotation}deg)` }}
                >
                  <video
                    ref={videoRef}
                    key={activeTab.id} // タブ切り替え時にビデオ要素を強制リロード
                    src={activeTab.videoSrc}
                    playsInline // 全画面にならずにインライン再生するための超重要属性
                    className={`w-full h-full max-h-[500px] object-contain transition-transform duration-200 ${
                      activeTab.isMirrored ? "scale-x-[-1]" : ""
                    }`}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onClick={togglePlay}
                  />

                  {/* グリッドオーバーレイ */}
                  {activeTab.showGrid && (
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-10 p-4">
                      <div className="border-r border-b border-dashed border-white/20"></div>
                      <div className="border-r border-b border-dashed border-white/20"></div>
                      <div className="border-b border-dashed border-white/20"></div>
                      <div className="border-r border-b border-dashed border-white/20"></div>
                      <div className="border-r border-b border-dashed border-white/20"></div>
                      <div className="border-b border-dashed border-white/20"></div>
                      <div className="border-r border-dashed border-white/20"></div>
                      <div className="border-r border-dashed border-white/20"></div>
                      <div></div>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 text-zinc-600 hover:text-zinc-400 cursor-pointer transition-colors text-center p-8"
                >
                  <Upload size={40} className="stroke-[1.5]" />
                  <p className="text-xs font-medium">このタブに動画が読み込まれていません<br />クリックしてファイルをインポート</p>
                </div>
              )}
            </div>
          </div>

          {/* 右カラム：ダンス練習用の特化メモエリア（1/3幅） */}
          <div className="bg-[#121215] border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col p-5">
            <div className="flex items-center gap-2 mb-3 text-zinc-400">
              <FileText size={16} />
              <h2 className="text-xs font-bold tracking-wider uppercase">練習ノート（この動画のメモ）</h2>
            </div>
            <textarea
              value={activeTab.notes}
              onChange={(e) => updateActiveTab({ notes: e.target.value })}
              placeholder="例: &#10;・2エイト目のフットワークで軸がブレる&#10;・スローで見るとヒットのタイミングが少し早い&#10;・意識：首のアイソレを意識してシルエットを大きく見せる"
              className="w-full flex-1 min-h-[150px] lg:min-h-[0] bg-[#16161A] border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none font-sans leading-relaxed"
            />
          </div>

        </div>

        {/* ================= 下部：コントロールパネル ================= */}
        {activeTab.videoSrc && (
          <div className="p-5 bg-[#121215] space-y-5">
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              
              {/* 再生系メインコントローラー */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => stepFrame("backward")}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
                  title="1フレーム戻る"
                >
                  <ChevronsLeft size={16} />
                </button>
                
                <button
                  onClick={togglePlay}
                  className="p-3 rounded-xl bg-white hover:bg-zinc-200 text-black transition-transform active:scale-95 shadow-md"
                >
                  {isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" />}
                </button>

                <button
                  onClick={() => stepFrame("forward")}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
                  title="1フレーム進む"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>

              {/* 分析トグル系（ミラー、回転、グリッド） */}
              <div className="flex flex-wrap items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 gap-1">
                <button
                  onClick={() => updateActiveTab({ isMirrored: !activeTab.isMirrored })}
                  className={`flex items-center gap-2 px-3 py-1.3 rounded-lg text-xs font-medium transition-all ${
                    activeTab.isMirrored ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <FlipHorizontal size={14} />
                  <span>ミラー {activeTab.isMirrored ? "ON" : "OFF"}</span>
                </button>

                <button
                  onClick={toggleRotation}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-zinc-500 hover:text-zinc-300 ${
                    activeTab.rotation !== 0 ? "bg-zinc-800 text-amber-400 shadow-sm" : ""
                  }`}
                  title="動画を90度回転"
                >
                  <RotateCw size={14} />
                  <span>回転 ({activeTab.rotation}°)</span>
                </button>

                <button
                  onClick={() => updateActiveTab({ showGrid: !activeTab.showGrid })}
                  className={`flex items-center gap-2 px-3 py-1.3 rounded-lg text-xs font-medium transition-all ${
                    activeTab.showGrid ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Grid size={14} />
                  <span>グリッド</span>
                </button>
              </div>

              {/* スピードメーター調整 */}
              <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60">
                {[0.25, 0.5, 0.75, 1.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleRateChange(rate)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                      activeTab.playbackRate === rate
                        ? "bg-zinc-200 text-black"
                        : "text-zinc-500 hover:bg-zinc-800"
                    }`}
                  >
                    {rate.toFixed(2)}x
                  </button>
                ))}
              </div>

            </div>

          </div>
        )}
      </div>
    </div>
  );
}